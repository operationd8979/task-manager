/**
 * 16 KB page-size alignment of an APK's or AAB's native libraries
 * (specs/002-ads-and-remove-ads plan D-27).
 *
 * Google Play requires apps targeting Android 15+ to support 16 KB memory
 * pages on 64-bit devices: every loadable segment of every 64-bit library must
 * be aligned to at least 16 KB. A library linked for 4 KB pages fails to load
 * on such a device. This reads the archive with Node's zlib alone, so the
 * check needs no bundletool, NDK or shell script, and runs the same on Windows.
 *
 * Pure: every input is a Buffer, so the rules are tested without files
 * (scripts/__tests__/elf-alignment.test.js).
 */
const zlib = require('node:zlib');

const PAGE_16K = 16384;
const PT_LOAD = 1;

/** The ABIs Play checks. 32-bit libraries run on 4 KB pages only. */
const LIBRARY_64 = /(?:^|\/)lib\/(arm64-v8a|x86_64)\/[^/]+\.so$/;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT = 0xffff;
const ZIP64_MARKER = 0xffffffff;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

/** The central directory: one record per file, where the true sizes live. */
function listZipEntries(zip) {
	const searchFrom = Math.max(0, zip.length - EOCD_MIN_SIZE - MAX_COMMENT);
	let eocd = -1;
	for (let at = zip.length - EOCD_MIN_SIZE; at >= searchFrom; at -= 1) {
		if (zip.readUInt32LE(at) === EOCD_SIGNATURE) {
			eocd = at;
			break;
		}
	}
	if (eocd < 0) {
		throw new Error('not a zip archive (no end of central directory)');
	}
	const count = zip.readUInt16LE(eocd + 10);
	const directoryOffset = zip.readUInt32LE(eocd + 16);
	if (directoryOffset === ZIP64_MARKER) {
		throw new Error('zip64 archives are not supported');
	}

	const entries = [];
	let at = directoryOffset;
	for (let index = 0; index < count; index += 1) {
		if (zip.readUInt32LE(at) !== CENTRAL_SIGNATURE) {
			throw new Error(`corrupt central directory at entry ${index}`);
		}
		const nameLength = zip.readUInt16LE(at + 28);
		const extraLength = zip.readUInt16LE(at + 30);
		const commentLength = zip.readUInt16LE(at + 32);
		entries.push({
			name: zip.toString('utf8', at + 46, at + 46 + nameLength),
			method: zip.readUInt16LE(at + 10),
			compressedSize: zip.readUInt32LE(at + 20),
			localHeaderOffset: zip.readUInt32LE(at + 42),
		});
		at += 46 + nameLength + extraLength + commentLength;
	}
	return entries;
}

function readZipEntry(zip, entry) {
	const at = entry.localHeaderOffset;
	if (zip.readUInt32LE(at) !== LOCAL_SIGNATURE) {
		throw new Error(`corrupt local header for ${entry.name}`);
	}
	const start = at + 30 + zip.readUInt16LE(at + 26) + zip.readUInt16LE(at + 28);
	const data = zip.subarray(start, start + entry.compressedSize);
	if (entry.method === METHOD_STORED) {
		return data;
	}
	if (entry.method === METHOD_DEFLATE) {
		return zlib.inflateRawSync(data);
	}
	throw new Error(`unsupported compression method ${entry.method} for ${entry.name}`);
}

/**
 * The `p_align` of every PT_LOAD segment of a 64-bit little-endian ELF file,
 * or null when the buffer is not one.
 */
function loadSegmentAlignments(elf) {
	const isElf = elf.length >= 64 && elf.readUInt32BE(0) === 0x7f454c46;
	if (!isElf || elf[4] !== 2 || elf[5] !== 1) {
		return null;
	}
	const headerOffset = Number(elf.readBigUInt64LE(0x20));
	const headerSize = elf.readUInt16LE(0x36);
	const headerCount = elf.readUInt16LE(0x38);
	const alignments = [];
	for (let index = 0; index < headerCount; index += 1) {
		const at = headerOffset + index * headerSize;
		if (elf.readUInt32LE(at) === PT_LOAD) {
			alignments.push(Number(elf.readBigUInt64LE(at + 0x30)));
		}
	}
	return alignments;
}

/**
 * Every 64-bit library in the archive, with its smallest PT_LOAD alignment.
 * `unaligned` lists those under 16 KB (or unreadable as ELF).
 */
function checkArchive(zip) {
	const libraries = listZipEntries(zip)
		.filter(entry => LIBRARY_64.test(entry.name))
		.map(entry => {
			const alignments = loadSegmentAlignments(readZipEntry(zip, entry));
			const minAlignment = alignments && alignments.length > 0 ? Math.min(...alignments) : 0;
			return { name: entry.name, minAlignment, aligned: minAlignment >= PAGE_16K };
		});
	return { libraries, unaligned: libraries.filter(library => !library.aligned) };
}

module.exports = {
	PAGE_16K,
	checkArchive,
	listZipEntries,
	loadSegmentAlignments,
	readZipEntry,
};
