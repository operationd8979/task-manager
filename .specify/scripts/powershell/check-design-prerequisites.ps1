#!/usr/bin/env pwsh

# Design-phase prerequisite checking (PowerShell)
#
# Mechanical checks only: path resolution, artifact presence, and hash-based
# staleness detection. All semantic validation (traceability, coverage,
# constitution gates) is performed by the /speckit-design-check skill.
#
# Usage: ./check-design-prerequisites.ps1 [OPTIONS]
#
# OPTIONS:
#   -Json               Output in JSON format
#   -RequireArtifacts   Fail when the design directory or manifest is missing
#   -PathsOnly          Only output path variables (no validation, no hashing)
#   -Help, -h           Show help message

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$RequireArtifacts,
    [switch]$PathsOnly,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Output @"
Usage: check-design-prerequisites.ps1 [OPTIONS]

Design-phase prerequisite checking for the Spec Kit 'design' extension.

OPTIONS:
  -Json               Output in JSON format
  -RequireArtifacts   Fail when the design directory or manifest is missing
  -PathsOnly          Only output path variables (no validation, no hashing)
  -Help, -h           Show this help message

EXAMPLES:
  # Paths only, before the design directory exists (used by design.brief)
  .\check-design-prerequisites.ps1 -Json -PathsOnly

  # Full state, tolerant of a missing manifest (used by design.import)
  .\check-design-prerequisites.ps1 -Json

  # Gate before planning (used by design.check)
  .\check-design-prerequisites.ps1 -Json -RequireArtifacts
"@
    exit 0
}

. "$PSScriptRoot/common.ps1"

function Get-FileSha256 {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    # Normalize line endings so a CRLF/LF checkout difference is not reported as drift.
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(((Get-Content -LiteralPath $Path -Raw) -replace "`r`n", "`n"))
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
    } finally {
        $sha.Dispose()
    }
}

$paths = Get-FeaturePathsEnv
$designDir = Join-Path $paths.FEATURE_DIR 'design'

$result = [ordered]@{
    REPO_ROOT     = $paths.REPO_ROOT
    BRANCH        = $paths.CURRENT_BRANCH
    FEATURE_DIR   = $paths.FEATURE_DIR
    FEATURE_SPEC  = $paths.FEATURE_SPEC
    DESIGN_DIR    = $designDir
    DESIGN_BRIEF  = Join-Path $designDir 'brief.md'
    DESIGN_MANIFEST = Join-Path $designDir 'manifest.json'
    DESIGN_TRACEABILITY = Join-Path $designDir 'traceability.md'
    DESIGN_CONFIG = Join-Path $paths.REPO_ROOT '.specify/extensions/design/design-config.yml'
}

if ($PathsOnly) {
    if ($Json) {
        [PSCustomObject]$result | ConvertTo-Json -Compress
    } else {
        $result.GetEnumerator() | ForEach-Object { Write-Output "$($_.Key): $($_.Value)" }
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $paths.FEATURE_SPEC -PathType Leaf)) {
    [Console]::Error.WriteLine("ERROR: spec.md not found: $($paths.FEATURE_SPEC)")
    [Console]::Error.WriteLine("Run $(Format-SpecKitCommand 'specify') first.")
    exit 1
}

$specHash = Get-FileSha256 -Path $paths.FEATURE_SPEC
$designDirExists = Test-Path -LiteralPath $designDir -PathType Container
$manifestPath = $result.DESIGN_MANIFEST
$manifest = $null
if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
    try {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    } catch {
        [Console]::Error.WriteLine("ERROR: Failed to parse ${manifestPath}: $_")
        exit 1
    }
}

if ($RequireArtifacts) {
    if (-not $designDirExists) {
        [Console]::Error.WriteLine("ERROR: Design directory not found: $designDir")
        [Console]::Error.WriteLine("Run $(Format-SpecKitCommand 'design.brief') then $(Format-SpecKitCommand 'design.import') first.")
        exit 1
    }
    if (-not $manifest) {
        [Console]::Error.WriteLine("ERROR: design/manifest.json not found or empty in $designDir")
        [Console]::Error.WriteLine("Run $(Format-SpecKitCommand 'design.import') to record design provenance.")
        exit 1
    }
}

# Inventory every markdown artifact actually present in the design directory.
$present = @()
if ($designDirExists) {
    $present = @(Get-ChildItem -LiteralPath $designDir -Filter '*.md' -File -ErrorAction SilentlyContinue |
        Sort-Object Name | ForEach-Object { $_.Name })
}

# Compare recorded hashes against current content: detects hand-edits to
# imported artifacts, which the check skill must surface rather than trust.
$modified = @()
$missingRecorded = @()
if ($manifest -and $manifest.artifacts) {
    foreach ($entry in $manifest.artifacts.PSObject.Properties) {
        $artifactPath = Join-Path $designDir $entry.Name
        $current = Get-FileSha256 -Path $artifactPath
        if ($null -eq $current) {
            $missingRecorded += $entry.Name
        } elseif ($current -ne [string]$entry.Value) {
            $modified += $entry.Name
        }
    }
}

$specChangedSinceBrief = $null
if ($manifest -and $manifest.spec_hash_at_brief) {
    $specChangedSinceBrief = ($specHash -ne [string]$manifest.spec_hash_at_brief)
}
$specChangedSinceImport = $null
if ($manifest -and $manifest.spec_hash_at_import) {
    $specChangedSinceImport = ($specHash -ne [string]$manifest.spec_hash_at_import)
}

$result.SPEC_HASH = $specHash
$result.DESIGN_DIR_EXISTS = $designDirExists
$result.MANIFEST_EXISTS = ($null -ne $manifest)
$result.DESIGN_STATUS = if ($manifest -and $manifest.status) { [string]$manifest.status } else { 'none' }
$result.DESIGN_SOURCE = if ($manifest -and $manifest.source) { $manifest.source } else { $null }
$result.BRIEF_EXISTS = (Test-Path -LiteralPath $result.DESIGN_BRIEF -PathType Leaf)
$result.TRACEABILITY_EXISTS = (Test-Path -LiteralPath $result.DESIGN_TRACEABILITY -PathType Leaf)
$result.SPEC_CHANGED_SINCE_BRIEF = $specChangedSinceBrief
$result.SPEC_CHANGED_SINCE_IMPORT = $specChangedSinceImport
$result.ARTIFACTS_PRESENT = $present
$result.ARTIFACTS_MODIFIED = $modified
$result.ARTIFACTS_MISSING = $missingRecorded

if ($Json) {
    [PSCustomObject]$result | ConvertTo-Json -Depth 5 -Compress
} else {
    foreach ($kv in $result.GetEnumerator()) {
        $value = $kv.Value
        if ($value -is [System.Array]) { $value = ($value -join ', ') }
        Write-Output "$($kv.Key): $value"
    }
}
