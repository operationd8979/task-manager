const zlib = require('node:zlib');

const { checkArchive, loadSegmentAlignments } = require('../elf-alignment.cjs');

const PT_LOAD = 1;
const PT_DYNAMIC = 2;
const ELF_HEADER_SIZE = 64;
const PROGRAM_HEADER_SIZE = 56;

/** A 64-bit little-endian ELF file holding only program headers. */
function elf64(segments) {
	const buffer = Buffer.alloc(ELF_HEADER_SIZE + segments.length * PROGRAM_HEADER_SIZE);
	buffer.writeUInt32BE(0x7f454c46, 0);
	buffer[4] = 2; // ELFCLASS64
	buffer[5] = 1; // little endian
	buffer.writeBigUInt64LE(BigInt(ELF_HEADER_SIZE), 0x20);
	buffer.writeUInt16LE(PROGRAM_HEADER_SIZE, 0x36);
	buffer.writeUInt16LE(segments.length, 0x38);
	segments.forEach(({ type, align }, index) => {
		const at = ELF_HEADER_SIZE + index * PROGRAM_HEADER_SIZE;
		buffer.writeUInt32LE(type, at);
		buffer.writeBigUInt64LE(BigInt(align), at + 0x30);
	});
	return buffer;
}

/** A zip archive; `deflate` entries are compressed as an AAB's are. */
function zip(files) {
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const { name, data, deflate } of files) {
		const body = deflate ? zlib.deflateRawSync(data) : data;
		const nameBytes = Buffer.from(name, 'utf8');
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(deflate ? 8 : 0, 8);
		local.writeUInt32LE(body.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBytes.length, 26);
		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(deflate ? 8 : 0, 10);
		central.writeUInt32LE(body.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(nameBytes.length, 28);
		central.writeUInt32LE(offset, 42);
		locals.push(local, nameBytes, body);
		centrals.push(central, nameBytes);
		offset += local.length + nameBytes.length + body.length;
	}
	const directory = Buffer.concat(centrals);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(files.length, 8);
	end.writeUInt16LE(files.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, directory, end]);
}

const aligned16k = elf64([
	{ type: PT_LOAD, align: 16384 },
	{ type: PT_DYNAMIC, align: 8 },
	{ type: PT_LOAD, align: 65536 },
]);
const aligned4k = elf64([
	{ type: PT_LOAD, align: 16384 },
	{ type: PT_LOAD, align: 4096 },
]);

describe('loadSegmentAlignments', () => {
	it('reads only the load segments', () => {
		expect(loadSegmentAlignments(aligned16k)).toEqual([16384, 65536]);
	});

	it('returns null for anything but a 64-bit little-endian ELF', () => {
		expect(loadSegmentAlignments(Buffer.from('not an elf file at all, just text padding it out'))).toBeNull();
		const elf32 = Buffer.from(aligned16k);
		elf32[4] = 1;
		expect(loadSegmentAlignments(elf32)).toBeNull();
	});
});

describe('checkArchive (plan D-27)', () => {
	it('passes an APK whose 64-bit libraries are 16 KB aligned', () => {
		const { libraries, unaligned } = checkArchive(
			zip([
				{ name: 'AndroidManifest.xml', data: Buffer.from('<manifest/>') },
				{ name: 'lib/arm64-v8a/libgood.so', data: aligned16k },
				{ name: 'lib/x86_64/libgood.so', data: aligned16k, deflate: true },
			]),
		);
		expect(libraries.map(library => library.name)).toEqual([
			'lib/arm64-v8a/libgood.so',
			'lib/x86_64/libgood.so',
		]);
		expect(unaligned).toEqual([]);
	});

	it('names a 4 KB library inside an AAB, compressed or not', () => {
		const { unaligned } = checkArchive(
			zip([
				{ name: 'base/lib/arm64-v8a/libgood.so', data: aligned16k, deflate: true },
				{ name: 'base/lib/arm64-v8a/libold.so', data: aligned4k, deflate: true },
			]),
		);
		expect(unaligned).toEqual([
			{ name: 'base/lib/arm64-v8a/libold.so', minAlignment: 4096, aligned: false },
		]);
	});

	it('ignores 32-bit libraries, which never run on 16 KB pages', () => {
		const { libraries } = checkArchive(
			zip([
				{ name: 'lib/armeabi-v7a/libold.so', data: aligned4k },
				{ name: 'lib/x86/libold.so', data: aligned4k },
			]),
		);
		expect(libraries).toEqual([]);
	});

	it('refuses something that is not a zip archive', () => {
		expect(() => checkArchive(Buffer.alloc(64))).toThrow('not a zip archive');
	});
});
