[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "Medium")]
param(
    [string]$ProjectRoot,

    [ValidatePattern("^[A-Za-z][A-Za-z0-9]*$")]
    [string]$Variant = "release",

    [ValidatePattern("^:?[A-Za-z][A-Za-z0-9]*(?::[A-Za-z][A-Za-z0-9]*)*$")]
    [string]$Module = "app",

    [ValidateNotNullOrEmpty()]
    [string]$OutputDirectory = ".artifacts\android",

    [string]$OutputName,

    [ValidateSet("armeabi-v7a", "arm64-v8a", "x86", "x86_64")]
    [string[]]$Architectures,

    [switch]$SkipClean,
    [switch]$DeepClean,
    [switch]$Force,

    [string[]]$GradleArguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-MobileProjectRoot {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Container)) {
        return $false
    }

    $packageJson = Join-Path $Path "package.json"
    $androidDir = Join-Path $Path "android"
    $windowsWrapper = Join-Path $androidDir "gradlew.bat"
    $unixWrapper = Join-Path $androidDir "gradlew"

    return (Test-Path -LiteralPath $packageJson -PathType Leaf) -and
        (Test-Path -LiteralPath $androidDir -PathType Container) -and
        ((Test-Path -LiteralPath $windowsWrapper -PathType Leaf) -or
            (Test-Path -LiteralPath $unixWrapper -PathType Leaf))
}

function Resolve-MobileProjectRoot {
    param([string]$RequestedRoot)

    if (-not [string]::IsNullOrWhiteSpace($RequestedRoot)) {
        if ([System.IO.Path]::IsPathRooted($RequestedRoot)) {
            $candidate = $RequestedRoot
        }
        else {
            $candidate = Join-Path (Get-Location).Path $RequestedRoot
        }

        if (-not (Test-MobileProjectRoot $candidate)) {
            throw "ProjectRoot is not a React Native Android project: $candidate"
        }

        return (Resolve-Path -LiteralPath $candidate).Path
    }

    $scriptParent = Split-Path -Parent $PSScriptRoot
    $candidates = @($PSScriptRoot, $scriptParent, (Get-Location).Path) | Select-Object -Unique
    foreach ($candidate in $candidates) {
        if (Test-MobileProjectRoot $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "Could not discover the project root. Pass -ProjectRoot explicitly."
}

function Get-FullPath {
    param(
        [string]$Path,
        [string]$BasePath
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Assert-SafeFileName {
    param([string]$Name)

    if ([string]::IsNullOrWhiteSpace($Name)) {
        throw "OutputName cannot be empty."
    }

    if ([System.IO.Path]::GetFileName($Name) -ne $Name) {
        throw "OutputName must be a file name, not a path: $Name"
    }

    if ($Name.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
        throw "OutputName contains invalid file-name characters: $Name"
    }

    if (-not [string]::Equals([System.IO.Path]::GetExtension($Name), ".apk", [StringComparison]::OrdinalIgnoreCase)) {
        throw "OutputName must end with .apk: $Name"
    }
}

function ConvertTo-SafeFilePart {
    param(
        [object]$Value,
        [string]$Fallback
    )

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $Fallback
    }

    $safe = ($text -replace "[^\p{L}\p{Nd}._-]+", "-").Trim([char[]]@("-", "."))
    if ([string]::IsNullOrWhiteSpace($safe)) {
        return $Fallback
    }

    return $safe
}

function Get-Sha256Hash {
    param([string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            $hashBytes = $sha256.ComputeHash($stream)
            return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "")
        }
        finally {
            $sha256.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

function Assert-SafeRemovalPath {
    param(
        [string]$Path,
        [string]$Root
    )

    $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\", "/")
    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path.TrimEnd("\", "/")
    $rootPrefix = $resolvedRoot + [System.IO.Path]::DirectorySeparatorChar

    if ($resolvedPath -eq $resolvedRoot -or
        -not $resolvedPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a path outside the project build tree: $resolvedPath"
    }

    $cursor = Get-Item -LiteralPath $resolvedPath -Force
    while ($null -ne $cursor -and
        -not [string]::Equals($cursor.FullName.TrimEnd("\", "/"), $resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
        if (($cursor.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing to remove a path through a junction or symbolic link: $($cursor.FullName)"
        }
        $cursor = $cursor.Parent
    }
}

function Assert-PathWithinRoot {
    param(
        [string]$Path,
        [string]$Root,
        [string]$Description
    )

    $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\", "/")
    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path.TrimEnd("\", "/")
    $rootPrefix = $resolvedRoot + [System.IO.Path]::DirectorySeparatorChar

    if (-not $resolvedPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Description is outside the expected output tree: $resolvedPath"
    }
}

function Remove-GeneratedDirectory {
    param(
        [string]$Path,
        [string]$Root
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        return
    }

    Assert-SafeRemovalPath -Path $Path -Root $Root
    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
    if ($PSCmdlet.ShouldProcess($resolvedPath, "Remove generated build directory")) {
        Remove-Item -LiteralPath $resolvedPath -Recurse -Force
    }
}

function Invoke-DeepClean {
    param(
        [string]$Root,
        [string]$AndroidPath,
        [string]$AppModulePath
    )

    $generatedPaths = New-Object System.Collections.Generic.List[string]
    $generatedPaths.Add((Join-Path $AndroidPath "build"))
    $generatedPaths.Add((Join-Path $AppModulePath "build"))
    $generatedPaths.Add((Join-Path $AppModulePath ".cxx"))

    foreach ($generatedPath in $generatedPaths | Select-Object -Unique) {
        Remove-GeneratedDirectory -Path $generatedPath -Root $Root
    }
}

function Get-JsonProperty {
    param(
        [object]$Object,
        [string]$Name,
        [object]$Fallback
    )

    if ($null -eq $Object) {
        return $Fallback
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        return $Fallback
    }

    return $property.Value
}

$resolvedProjectRoot = Resolve-MobileProjectRoot $ProjectRoot
$androidDir = Join-Path $resolvedProjectRoot "android"
$packageJsonPath = Join-Path $resolvedProjectRoot "package.json"

$normalizedModule = $Module.Trim(":")
$moduleSegments = $normalizedModule -split ":"
$moduleRelativePath = $moduleSegments -join [System.IO.Path]::DirectorySeparatorChar
$moduleDir = Join-Path $androidDir $moduleRelativePath
$moduleBuildFile = Join-Path $moduleDir "build.gradle"
$moduleBuildFileKts = Join-Path $moduleDir "build.gradle.kts"

if (-not (Test-Path -LiteralPath $moduleDir -PathType Container) -or
    (-not (Test-Path -LiteralPath $moduleBuildFile -PathType Leaf) -and
        -not (Test-Path -LiteralPath $moduleBuildFileKts -PathType Leaf))) {
    throw "Android application module was not found: $moduleDir"
}

if ($env:OS -eq "Windows_NT") {
    $gradleWrapper = Join-Path $androidDir "gradlew.bat"
}
else {
    $gradleWrapper = Join-Path $androidDir "gradlew"
}

if (-not (Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
    throw "Gradle wrapper was not found: $gradleWrapper"
}

if (-not [string]::IsNullOrWhiteSpace($OutputName)) {
    Assert-SafeFileName $OutputName
}

$resolvedOutputDirectory = Get-FullPath -Path $OutputDirectory -BasePath $resolvedProjectRoot
if ((Test-Path -LiteralPath $resolvedOutputDirectory) -and
    -not (Test-Path -LiteralPath $resolvedOutputDirectory -PathType Container)) {
    throw "OutputDirectory exists but is not a directory: $resolvedOutputDirectory"
}

$packageMetadata = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$packageName = Get-JsonProperty -Object $packageMetadata -Name "name" -Fallback "android-app"
$appFilePart = ConvertTo-SafeFilePart -Value $packageName -Fallback "android-app"

if ($DeepClean) {
    Invoke-DeepClean -Root $resolvedProjectRoot -AndroidPath $androidDir -AppModulePath $moduleDir
}

$variantTaskSuffix = $Variant.Substring(0, 1).ToUpperInvariant() + $Variant.Substring(1)
$moduleGradlePath = ":" + ($moduleSegments -join ":")
$assembleTask = "{0}:assemble{1}" -f $moduleGradlePath, $variantTaskSuffix
$gradleInvocationArguments = New-Object System.Collections.Generic.List[string]

if (-not $SkipClean) {
    $gradleInvocationArguments.Add("clean")
}
$gradleInvocationArguments.Add($assembleTask)

if ($null -ne $Architectures -and $Architectures.Count -gt 0) {
    $gradleInvocationArguments.Add("-PreactNativeArchitectures=$($Architectures -join ',')")
}

if ($null -ne $GradleArguments) {
    foreach ($argument in $GradleArguments) {
        if (-not [string]::IsNullOrWhiteSpace($argument)) {
            $gradleInvocationArguments.Add($argument)
        }
    }
}

$taskSummary = if ($SkipClean) { $assembleTask } else { "clean, $assembleTask" }
if (-not $PSCmdlet.ShouldProcess($resolvedProjectRoot, "Run Gradle tasks: $taskSummary")) {
    return
}

$pushedLocation = $false
try {
    Push-Location $androidDir
    $pushedLocation = $true

    $gradleArgumentArray = $gradleInvocationArguments.ToArray()
    & $gradleWrapper @gradleArgumentArray
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed with exit code $LASTEXITCODE"
    }
}
finally {
    if ($pushedLocation) {
        Pop-Location
    }
}

$apkOutputRoot = Join-Path (Join-Path $moduleDir "build\outputs") "apk"
if (-not (Test-Path -LiteralPath $apkOutputRoot -PathType Container)) {
    throw "Gradle did not create an APK output directory: $apkOutputRoot"
}

$matchingMetadataDocuments = New-Object System.Collections.Generic.List[object]
foreach ($metadataFile in Get-ChildItem -LiteralPath $apkOutputRoot -Filter "output-metadata.json" -File -Recurse) {
    $metadata = Get-Content -LiteralPath $metadataFile.FullName -Raw | ConvertFrom-Json
    $metadataVariant = [string](Get-JsonProperty -Object $metadata -Name "variantName" -Fallback "")
    $artifactType = Get-JsonProperty -Object $metadata -Name "artifactType" -Fallback $null
    $artifactTypeName = [string](Get-JsonProperty -Object $artifactType -Name "type" -Fallback "")

    if (-not [string]::Equals($metadataVariant, $Variant, [StringComparison]::OrdinalIgnoreCase) -or
        -not [string]::Equals($artifactTypeName, "APK", [StringComparison]::OrdinalIgnoreCase)) {
        continue
    }

    $matchingMetadataDocuments.Add([pscustomobject]@{
        File     = $metadataFile
        Metadata = $metadata
    })
}

if ($matchingMetadataDocuments.Count -eq 0) {
    throw "No APK metadata matched variant '$Variant' under $apkOutputRoot"
}

if ($matchingMetadataDocuments.Count -gt 1) {
    $metadataPaths = ($matchingMetadataDocuments | ForEach-Object { $_.File.FullName }) -join ", "
    throw "Multiple APK metadata files matched variant '$Variant': $metadataPaths"
}

$artifactByPath = @{}
$metadataDocument = $matchingMetadataDocuments[0]
$metadataFile = $metadataDocument.File
$metadata = $metadataDocument.Metadata
$metadataVariant = [string](Get-JsonProperty -Object $metadata -Name "variantName" -Fallback "")
$applicationId = [string](Get-JsonProperty -Object $metadata -Name "applicationId" -Fallback "unknown")
$elements = @(Get-JsonProperty -Object $metadata -Name "elements" -Fallback @())
foreach ($element in $elements) {
    $relativeOutputFile = [string](Get-JsonProperty -Object $element -Name "outputFile" -Fallback "")
    if ([string]::IsNullOrWhiteSpace($relativeOutputFile)) {
        continue
    }

    $sourceApk = Join-Path $metadataFile.Directory.FullName $relativeOutputFile
    if (-not (Test-Path -LiteralPath $sourceApk -PathType Leaf)) {
        throw "APK listed by Gradle metadata was not found: $sourceApk"
    }

    Assert-PathWithinRoot -Path $sourceApk -Root $apkOutputRoot -Description "APK metadata output"
    $resolvedSourceApk = (Resolve-Path -LiteralPath $sourceApk).Path
    if (-not [string]::Equals([System.IO.Path]::GetExtension($resolvedSourceApk), ".apk", [StringComparison]::OrdinalIgnoreCase)) {
        throw "Gradle metadata output is not an APK: $resolvedSourceApk"
    }

    $artifactByPath[$resolvedSourceApk.ToLowerInvariant()] = [pscustomobject]@{
        SourcePath    = $resolvedSourceApk
        SourceName    = [System.IO.Path]::GetFileNameWithoutExtension($resolvedSourceApk)
        ApplicationId = $applicationId
        Variant       = $metadataVariant
        VersionCode   = Get-JsonProperty -Object $element -Name "versionCode" -Fallback "unknown"
        VersionName   = Get-JsonProperty -Object $element -Name "versionName" -Fallback "unknown"
    }
}

$artifacts = @($artifactByPath.Values | Sort-Object SourcePath)
if ($artifacts.Count -eq 0) {
    throw "APK metadata for variant '$Variant' did not contain any output files."
}

if ($artifacts.Count -gt 1 -and -not [string]::IsNullOrWhiteSpace($OutputName)) {
    throw "Variant '$Variant' produced $($artifacts.Count) APKs. Omit -OutputName so each split keeps a unique name."
}

$plannedCopies = New-Object System.Collections.Generic.List[object]
$plannedTargets = @{}
foreach ($artifact in $artifacts) {
    if (-not [string]::IsNullOrWhiteSpace($OutputName)) {
        $targetName = $OutputName
    }
    else {
        $versionNamePart = ConvertTo-SafeFilePart -Value $artifact.VersionName -Fallback "unknown"
        $versionCodePart = ConvertTo-SafeFilePart -Value $artifact.VersionCode -Fallback "unknown"
        $variantPart = ConvertTo-SafeFilePart -Value $artifact.Variant -Fallback "release"
        $targetName = "$appFilePart-$versionNamePart-$versionCodePart-$variantPart"

        if ($artifacts.Count -gt 1) {
            $sourcePart = ConvertTo-SafeFilePart -Value $artifact.SourceName -Fallback "split"
            $targetName = "$targetName-$sourcePart"
        }

        $targetName += ".apk"
    }

    $targetPath = [System.IO.Path]::GetFullPath((Join-Path $resolvedOutputDirectory $targetName))
    if ([string]::Equals($artifact.SourcePath, $targetPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to use the Gradle output APK as its own artifact target: $targetPath"
    }

    $targetKey = $targetPath.ToLowerInvariant()
    if ($plannedTargets.ContainsKey($targetKey)) {
        throw "Multiple APK outputs would overwrite the same target: $targetPath"
    }
    $plannedTargets[$targetKey] = $true

    if (Test-Path -LiteralPath $targetPath) {
        $existingTarget = Get-Item -LiteralPath $targetPath -Force
        if ($existingTarget.PSIsContainer) {
            throw "APK target exists as a directory: $targetPath"
        }
        if (($existingTarget.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing to overwrite an APK target that is a symbolic link or reparse point: $targetPath"
        }
        if (-not $Force) {
            throw "APK already exists. Pass -Force to overwrite it: $targetPath"
        }
    }

    $plannedCopies.Add([pscustomobject]@{
        Artifact  = $artifact
        TargetPath = $targetPath
    })
}

if (-not (Test-Path -LiteralPath $resolvedOutputDirectory -PathType Container)) {
    if ($PSCmdlet.ShouldProcess($resolvedOutputDirectory, "Create APK output directory")) {
        New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
    }
}

$results = New-Object System.Collections.Generic.List[object]
foreach ($plannedCopy in $plannedCopies) {
    $artifact = $plannedCopy.Artifact
    $targetPath = $plannedCopy.TargetPath

    $copyAction = if (Test-Path -LiteralPath $targetPath -PathType Leaf) { "Overwrite APK artifact" } else { "Copy APK artifact" }
    if (-not $PSCmdlet.ShouldProcess($targetPath, $copyAction)) {
        continue
    }

    Copy-Item -LiteralPath $artifact.SourcePath -Destination $targetPath -Force:$($Force.IsPresent)
    $targetItem = Get-Item -LiteralPath $targetPath
    $hash = Get-Sha256Hash -Path $targetPath

    $result = [pscustomobject]@{
        Path          = $targetItem.FullName
        ApplicationId = $artifact.ApplicationId
        Variant       = $artifact.Variant
        VersionName   = $artifact.VersionName
        VersionCode   = $artifact.VersionCode
        Bytes         = $targetItem.Length
        SHA256        = $hash
    }
    $results.Add($result)

    Write-Host "APK created: $($targetItem.FullName)"
    Write-Host "SHA-256: $hash"
}

Write-Warning "APK signing is controlled by the app's Gradle configuration; this script does not make an APK production-signed."
$results.ToArray()
