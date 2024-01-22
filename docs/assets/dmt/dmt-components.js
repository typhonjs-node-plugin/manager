/**
 * @module @typhonjs-typedoc/typedoc-theme-dmt
 * @license MPL-2.0
 * @see https://github.com/typhonjs-typedoc/typedoc-theme-dmt
 */
 
(function () {
	'use strict';

	var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
	var decoder;
	try {
		decoder = new TextDecoder();
	} catch(error) {}
	var src;
	var srcEnd;
	var position$1 = 0;
	var currentUnpackr = {};
	var currentStructures;
	var srcString;
	var srcStringStart = 0;
	var srcStringEnd = 0;
	var bundledStrings$1;
	var referenceMap;
	var currentExtensions = [];
	var dataView;
	var defaultOptions = {
		useRecords: false,
		mapsAsObjects: true
	};
	class C1Type {}
	const C1 = new C1Type();
	C1.name = 'MessagePack 0xC1';
	var sequentialMode = false;
	var inlineObjectReadThreshold = 2;
	var readStruct;
	// no-eval build
	try {
		new Function('');
	} catch(error) {
		// if eval variants are not supported, do not create inline object readers ever
		inlineObjectReadThreshold = Infinity;
	}

	class Unpackr {
		constructor(options) {
			if (options) {
				if (options.useRecords === false && options.mapsAsObjects === undefined)
					options.mapsAsObjects = true;
				if (options.sequential && options.trusted !== false) {
					options.trusted = true;
					if (!options.structures && options.useRecords != false) {
						options.structures = [];
						if (!options.maxSharedStructures)
							options.maxSharedStructures = 0;
					}
				}
				if (options.structures)
					options.structures.sharedLength = options.structures.length;
				else if (options.getStructures) {
					(options.structures = []).uninitialized = true; // this is what we use to denote an uninitialized structures
					options.structures.sharedLength = 0;
				}
				if (options.int64AsNumber) {
					options.int64AsType = 'number';
				}
			}
			Object.assign(this, options);
		}
		unpack(source, options) {
			if (src) {
				// re-entrant execution, save the state and restore it after we do this unpack
				return saveState(() => {
					clearSource();
					return this ? this.unpack(source, options) : Unpackr.prototype.unpack.call(defaultOptions, source, options)
				})
			}
			if (!source.buffer && source.constructor === ArrayBuffer)
				source = typeof Buffer !== 'undefined' ? Buffer.from(source) : new Uint8Array(source);
			if (typeof options === 'object') {
				srcEnd = options.end || source.length;
				position$1 = options.start || 0;
			} else {
				position$1 = 0;
				srcEnd = options > -1 ? options : source.length;
			}
			srcStringEnd = 0;
			srcString = null;
			bundledStrings$1 = null;
			src = source;
			// this provides cached access to the data view for a buffer if it is getting reused, which is a recommend
			// technique for getting data from a database where it can be copied into an existing buffer instead of creating
			// new ones
			try {
				dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength));
			} catch(error) {
				// if it doesn't have a buffer, maybe it is the wrong type of object
				src = null;
				if (source instanceof Uint8Array)
					throw error
				throw new Error('Source must be a Uint8Array or Buffer but was a ' + ((source && typeof source == 'object') ? source.constructor.name : typeof source))
			}
			if (this instanceof Unpackr) {
				currentUnpackr = this;
				if (this.structures) {
					currentStructures = this.structures;
					return checkedRead(options)
				} else if (!currentStructures || currentStructures.length > 0) {
					currentStructures = [];
				}
			} else {
				currentUnpackr = defaultOptions;
				if (!currentStructures || currentStructures.length > 0)
					currentStructures = [];
			}
			return checkedRead(options)
		}
		unpackMultiple(source, forEach) {
			let values, lastPosition = 0;
			try {
				sequentialMode = true;
				let size = source.length;
				let value = this ? this.unpack(source, size) : defaultUnpackr.unpack(source, size);
				if (forEach) {
					if (forEach(value, lastPosition, position$1) === false) return;
					while(position$1 < size) {
						lastPosition = position$1;
						if (forEach(checkedRead(), lastPosition, position$1) === false) {
							return
						}
					}
				}
				else {
					values = [ value ];
					while(position$1 < size) {
						lastPosition = position$1;
						values.push(checkedRead());
					}
					return values
				}
			} catch(error) {
				error.lastPosition = lastPosition;
				error.values = values;
				throw error
			} finally {
				sequentialMode = false;
				clearSource();
			}
		}
		_mergeStructures(loadedStructures, existingStructures) {
			loadedStructures = loadedStructures || [];
			if (Object.isFrozen(loadedStructures))
				loadedStructures = loadedStructures.map(structure => structure.slice(0));
			for (let i = 0, l = loadedStructures.length; i < l; i++) {
				let structure = loadedStructures[i];
				if (structure) {
					structure.isShared = true;
					if (i >= 32)
						structure.highByte = (i - 32) >> 5;
				}
			}
			loadedStructures.sharedLength = loadedStructures.length;
			for (let id in existingStructures || []) {
				if (id >= 0) {
					let structure = loadedStructures[id];
					let existing = existingStructures[id];
					if (existing) {
						if (structure)
							(loadedStructures.restoreStructures || (loadedStructures.restoreStructures = []))[id] = structure;
						loadedStructures[id] = existing;
					}
				}
			}
			return this.structures = loadedStructures
		}
		decode(source, options) {
			return this.unpack(source, options)
		}
	}
	function checkedRead(options) {
		try {
			if (!currentUnpackr.trusted && !sequentialMode) {
				let sharedLength = currentStructures.sharedLength || 0;
				if (sharedLength < currentStructures.length)
					currentStructures.length = sharedLength;
			}
			let result;
			if (currentUnpackr.randomAccessStructure && src[position$1] < 0x40 && src[position$1] >= 0x20 && readStruct) {
				result = readStruct(src, position$1, srcEnd, currentUnpackr);
				src = null; // dispose of this so that recursive unpack calls don't save state
				if (!(options && options.lazy) && result)
					result = result.toJSON();
				position$1 = srcEnd;
			} else
				result = read();
			if (bundledStrings$1) { // bundled strings to skip past
				position$1 = bundledStrings$1.postBundlePosition;
				bundledStrings$1 = null;
			}
			if (sequentialMode)
				// we only need to restore the structures if there was an error, but if we completed a read,
				// we can clear this out and keep the structures we read
				currentStructures.restoreStructures = null;

			if (position$1 == srcEnd) {
				// finished reading this source, cleanup references
				if (currentStructures && currentStructures.restoreStructures)
					restoreStructures();
				currentStructures = null;
				src = null;
				if (referenceMap)
					referenceMap = null;
			} else if (position$1 > srcEnd) {
				// over read
				throw new Error('Unexpected end of MessagePack data')
			} else if (!sequentialMode) {
				let jsonView;
				try {
					jsonView = JSON.stringify(result, (_, value) => typeof value === "bigint" ? `${value}n` : value).slice(0, 100);
				} catch(error) {
					jsonView = '(JSON view not available ' + error + ')';
				}
				throw new Error('Data read, but end of buffer not reached ' + jsonView)
			}
			// else more to read, but we are reading sequentially, so don't clear source yet
			return result
		} catch(error) {
			if (currentStructures && currentStructures.restoreStructures)
				restoreStructures();
			clearSource();
			if (error instanceof RangeError || error.message.startsWith('Unexpected end of buffer') || position$1 > srcEnd) {
				error.incomplete = true;
			}
			throw error
		}
	}

	function restoreStructures() {
		for (let id in currentStructures.restoreStructures) {
			currentStructures[id] = currentStructures.restoreStructures[id];
		}
		currentStructures.restoreStructures = null;
	}

	function read() {
		let token = src[position$1++];
		if (token < 0xa0) {
			if (token < 0x80) {
				if (token < 0x40)
					return token
				else {
					let structure = currentStructures[token & 0x3f] ||
						currentUnpackr.getStructures && loadStructures()[token & 0x3f];
					if (structure) {
						if (!structure.read) {
							structure.read = createStructureReader(structure, token & 0x3f);
						}
						return structure.read()
					} else
						return token
				}
			} else if (token < 0x90) {
				// map
				token -= 0x80;
				if (currentUnpackr.mapsAsObjects) {
					let object = {};
					for (let i = 0; i < token; i++) {
						let key = readKey();
						if (key === '__proto__')
							key = '__proto_';
						object[key] = read();
					}
					return object
				} else {
					let map = new Map();
					for (let i = 0; i < token; i++) {
						map.set(read(), read());
					}
					return map
				}
			} else {
				token -= 0x90;
				let array = new Array(token);
				for (let i = 0; i < token; i++) {
					array[i] = read();
				}
				if (currentUnpackr.freezeData)
					return Object.freeze(array)
				return array
			}
		} else if (token < 0xc0) {
			// fixstr
			let length = token - 0xa0;
			if (srcStringEnd >= position$1) {
				return srcString.slice(position$1 - srcStringStart, (position$1 += length) - srcStringStart)
			}
			if (srcStringEnd == 0 && srcEnd < 140) {
				// for small blocks, avoiding the overhead of the extract call is helpful
				let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
				if (string != null)
					return string
			}
			return readFixedString(length)
		} else {
			let value;
			switch (token) {
				case 0xc0: return null
				case 0xc1:
					if (bundledStrings$1) {
						value = read(); // followed by the length of the string in characters (not bytes!)
						if (value > 0)
							return bundledStrings$1[1].slice(bundledStrings$1.position1, bundledStrings$1.position1 += value)
						else
							return bundledStrings$1[0].slice(bundledStrings$1.position0, bundledStrings$1.position0 -= value)
					}
					return C1; // "never-used", return special object to denote that
				case 0xc2: return false
				case 0xc3: return true
				case 0xc4:
					// bin 8
					value = src[position$1++];
					if (value === undefined)
						throw new Error('Unexpected end of buffer')
					return readBin(value)
				case 0xc5:
					// bin 16
					value = dataView.getUint16(position$1);
					position$1 += 2;
					return readBin(value)
				case 0xc6:
					// bin 32
					value = dataView.getUint32(position$1);
					position$1 += 4;
					return readBin(value)
				case 0xc7:
					// ext 8
					return readExt(src[position$1++])
				case 0xc8:
					// ext 16
					value = dataView.getUint16(position$1);
					position$1 += 2;
					return readExt(value)
				case 0xc9:
					// ext 32
					value = dataView.getUint32(position$1);
					position$1 += 4;
					return readExt(value)
				case 0xca:
					value = dataView.getFloat32(position$1);
					if (currentUnpackr.useFloat32 > 2) {
						// this does rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
						let multiplier = mult10[((src[position$1] & 0x7f) << 1) | (src[position$1 + 1] >> 7)];
						position$1 += 4;
						return ((multiplier * value + (value > 0 ? 0.5 : -0.5)) >> 0) / multiplier
					}
					position$1 += 4;
					return value
				case 0xcb:
					value = dataView.getFloat64(position$1);
					position$1 += 8;
					return value
				// uint handlers
				case 0xcc:
					return src[position$1++]
				case 0xcd:
					value = dataView.getUint16(position$1);
					position$1 += 2;
					return value
				case 0xce:
					value = dataView.getUint32(position$1);
					position$1 += 4;
					return value
				case 0xcf:
					if (currentUnpackr.int64AsType === 'number') {
						value = dataView.getUint32(position$1) * 0x100000000;
						value += dataView.getUint32(position$1 + 4);
					} else if (currentUnpackr.int64AsType === 'string') {
						value = dataView.getBigUint64(position$1).toString();
					} else if (currentUnpackr.int64AsType === 'auto') {
						value = dataView.getBigUint64(position$1);
						if (value<=BigInt(2)<<BigInt(52)) value=Number(value);
					} else
						value = dataView.getBigUint64(position$1);
					position$1 += 8;
					return value

				// int handlers
				case 0xd0:
					return dataView.getInt8(position$1++)
				case 0xd1:
					value = dataView.getInt16(position$1);
					position$1 += 2;
					return value
				case 0xd2:
					value = dataView.getInt32(position$1);
					position$1 += 4;
					return value
				case 0xd3:
					if (currentUnpackr.int64AsType === 'number') {
						value = dataView.getInt32(position$1) * 0x100000000;
						value += dataView.getUint32(position$1 + 4);
					} else if (currentUnpackr.int64AsType === 'string') {
						value = dataView.getBigInt64(position$1).toString();
					} else if (currentUnpackr.int64AsType === 'auto') {
						value = dataView.getBigInt64(position$1);
						if (value>=BigInt(-2)<<BigInt(52)&&value<=BigInt(2)<<BigInt(52)) value=Number(value);
					} else
						value = dataView.getBigInt64(position$1);
					position$1 += 8;
					return value

				case 0xd4:
					// fixext 1
					value = src[position$1++];
					if (value == 0x72) {
						return recordDefinition(src[position$1++] & 0x3f)
					} else {
						let extension = currentExtensions[value];
						if (extension) {
							if (extension.read) {
								position$1++; // skip filler byte
								return extension.read(read())
							} else if (extension.noBuffer) {
								position$1++; // skip filler byte
								return extension()
							} else
								return extension(src.subarray(position$1, ++position$1))
						} else
							throw new Error('Unknown extension ' + value)
					}
				case 0xd5:
					// fixext 2
					value = src[position$1];
					if (value == 0x72) {
						position$1++;
						return recordDefinition(src[position$1++] & 0x3f, src[position$1++])
					} else
						return readExt(2)
				case 0xd6:
					// fixext 4
					return readExt(4)
				case 0xd7:
					// fixext 8
					return readExt(8)
				case 0xd8:
					// fixext 16
					return readExt(16)
				case 0xd9:
				// str 8
					value = src[position$1++];
					if (srcStringEnd >= position$1) {
						return srcString.slice(position$1 - srcStringStart, (position$1 += value) - srcStringStart)
					}
					return readString8(value)
				case 0xda:
				// str 16
					value = dataView.getUint16(position$1);
					position$1 += 2;
					if (srcStringEnd >= position$1) {
						return srcString.slice(position$1 - srcStringStart, (position$1 += value) - srcStringStart)
					}
					return readString16(value)
				case 0xdb:
				// str 32
					value = dataView.getUint32(position$1);
					position$1 += 4;
					if (srcStringEnd >= position$1) {
						return srcString.slice(position$1 - srcStringStart, (position$1 += value) - srcStringStart)
					}
					return readString32(value)
				case 0xdc:
				// array 16
					value = dataView.getUint16(position$1);
					position$1 += 2;
					return readArray(value)
				case 0xdd:
				// array 32
					value = dataView.getUint32(position$1);
					position$1 += 4;
					return readArray(value)
				case 0xde:
				// map 16
					value = dataView.getUint16(position$1);
					position$1 += 2;
					return readMap(value)
				case 0xdf:
				// map 32
					value = dataView.getUint32(position$1);
					position$1 += 4;
					return readMap(value)
				default: // negative int
					if (token >= 0xe0)
						return token - 0x100
					if (token === undefined) {
						let error = new Error('Unexpected end of MessagePack data');
						error.incomplete = true;
						throw error
					}
					throw new Error('Unknown MessagePack token ' + token)

			}
		}
	}
	const validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
	function createStructureReader(structure, firstId) {
		function readObject() {
			// This initial function is quick to instantiate, but runs slower. After several iterations pay the cost to build the faster function
			if (readObject.count++ > inlineObjectReadThreshold) {
				let readObject = structure.read = (new Function('r', 'return function(){return ' + (currentUnpackr.freezeData ? 'Object.freeze' : '') +
					'({' + structure.map(key => key === '__proto__' ? '__proto_:r()' : validName.test(key) ? key + ':r()' : ('[' + JSON.stringify(key) + ']:r()')).join(',') + '})}'))(read);
				if (structure.highByte === 0)
					structure.read = createSecondByteReader(firstId, structure.read);
				return readObject() // second byte is already read, if there is one so immediately read object
			}
			let object = {};
			for (let i = 0, l = structure.length; i < l; i++) {
				let key = structure[i];
				if (key === '__proto__')
					key = '__proto_';
				object[key] = read();
			}
			if (currentUnpackr.freezeData)
				return Object.freeze(object);
			return object
		}
		readObject.count = 0;
		if (structure.highByte === 0) {
			return createSecondByteReader(firstId, readObject)
		}
		return readObject
	}

	const createSecondByteReader = (firstId, read0) => {
		return function() {
			let highByte = src[position$1++];
			if (highByte === 0)
				return read0()
			let id = firstId < 32 ? -(firstId + (highByte << 5)) : firstId + (highByte << 5);
			let structure = currentStructures[id] || loadStructures()[id];
			if (!structure) {
				throw new Error('Record id is not defined for ' + id)
			}
			if (!structure.read)
				structure.read = createStructureReader(structure, firstId);
			return structure.read()
		}
	};

	function loadStructures() {
		let loadedStructures = saveState(() => {
			// save the state in case getStructures modifies our buffer
			src = null;
			return currentUnpackr.getStructures()
		});
		return currentStructures = currentUnpackr._mergeStructures(loadedStructures, currentStructures)
	}

	var readFixedString = readStringJS;
	var readString8 = readStringJS;
	var readString16 = readStringJS;
	var readString32 = readStringJS;
	function readStringJS(length) {
		let result;
		if (length < 16) {
			if (result = shortStringInJS(length))
				return result
		}
		if (length > 64 && decoder)
			return decoder.decode(src.subarray(position$1, position$1 += length))
		const end = position$1 + length;
		const units = [];
		result = '';
		while (position$1 < end) {
			const byte1 = src[position$1++];
			if ((byte1 & 0x80) === 0) {
				// 1 byte
				units.push(byte1);
			} else if ((byte1 & 0xe0) === 0xc0) {
				// 2 bytes
				const byte2 = src[position$1++] & 0x3f;
				units.push(((byte1 & 0x1f) << 6) | byte2);
			} else if ((byte1 & 0xf0) === 0xe0) {
				// 3 bytes
				const byte2 = src[position$1++] & 0x3f;
				const byte3 = src[position$1++] & 0x3f;
				units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
			} else if ((byte1 & 0xf8) === 0xf0) {
				// 4 bytes
				const byte2 = src[position$1++] & 0x3f;
				const byte3 = src[position$1++] & 0x3f;
				const byte4 = src[position$1++] & 0x3f;
				let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
				if (unit > 0xffff) {
					unit -= 0x10000;
					units.push(((unit >>> 10) & 0x3ff) | 0xd800);
					unit = 0xdc00 | (unit & 0x3ff);
				}
				units.push(unit);
			} else {
				units.push(byte1);
			}

			if (units.length >= 0x1000) {
				result += fromCharCode.apply(String, units);
				units.length = 0;
			}
		}

		if (units.length > 0) {
			result += fromCharCode.apply(String, units);
		}

		return result
	}

	function readArray(length) {
		let array = new Array(length);
		for (let i = 0; i < length; i++) {
			array[i] = read();
		}
		if (currentUnpackr.freezeData)
			return Object.freeze(array)
		return array
	}

	function readMap(length) {
		if (currentUnpackr.mapsAsObjects) {
			let object = {};
			for (let i = 0; i < length; i++) {
				let key = readKey();
				if (key === '__proto__')
					key = '__proto_';
				object[key] = read();
			}
			return object
		} else {
			let map = new Map();
			for (let i = 0; i < length; i++) {
				map.set(read(), read());
			}
			return map
		}
	}

	var fromCharCode = String.fromCharCode;
	function longStringInJS(length) {
		let start = position$1;
		let bytes = new Array(length);
		for (let i = 0; i < length; i++) {
			const byte = src[position$1++];
			if ((byte & 0x80) > 0) {
					position$1 = start;
					return
				}
				bytes[i] = byte;
			}
			return fromCharCode.apply(String, bytes)
	}
	function shortStringInJS(length) {
		if (length < 4) {
			if (length < 2) {
				if (length === 0)
					return ''
				else {
					let a = src[position$1++];
					if ((a & 0x80) > 1) {
						position$1 -= 1;
						return
					}
					return fromCharCode(a)
				}
			} else {
				let a = src[position$1++];
				let b = src[position$1++];
				if ((a & 0x80) > 0 || (b & 0x80) > 0) {
					position$1 -= 2;
					return
				}
				if (length < 3)
					return fromCharCode(a, b)
				let c = src[position$1++];
				if ((c & 0x80) > 0) {
					position$1 -= 3;
					return
				}
				return fromCharCode(a, b, c)
			}
		} else {
			let a = src[position$1++];
			let b = src[position$1++];
			let c = src[position$1++];
			let d = src[position$1++];
			if ((a & 0x80) > 0 || (b & 0x80) > 0 || (c & 0x80) > 0 || (d & 0x80) > 0) {
				position$1 -= 4;
				return
			}
			if (length < 6) {
				if (length === 4)
					return fromCharCode(a, b, c, d)
				else {
					let e = src[position$1++];
					if ((e & 0x80) > 0) {
						position$1 -= 5;
						return
					}
					return fromCharCode(a, b, c, d, e)
				}
			} else if (length < 8) {
				let e = src[position$1++];
				let f = src[position$1++];
				if ((e & 0x80) > 0 || (f & 0x80) > 0) {
					position$1 -= 6;
					return
				}
				if (length < 7)
					return fromCharCode(a, b, c, d, e, f)
				let g = src[position$1++];
				if ((g & 0x80) > 0) {
					position$1 -= 7;
					return
				}
				return fromCharCode(a, b, c, d, e, f, g)
			} else {
				let e = src[position$1++];
				let f = src[position$1++];
				let g = src[position$1++];
				let h = src[position$1++];
				if ((e & 0x80) > 0 || (f & 0x80) > 0 || (g & 0x80) > 0 || (h & 0x80) > 0) {
					position$1 -= 8;
					return
				}
				if (length < 10) {
					if (length === 8)
						return fromCharCode(a, b, c, d, e, f, g, h)
					else {
						let i = src[position$1++];
						if ((i & 0x80) > 0) {
							position$1 -= 9;
							return
						}
						return fromCharCode(a, b, c, d, e, f, g, h, i)
					}
				} else if (length < 12) {
					let i = src[position$1++];
					let j = src[position$1++];
					if ((i & 0x80) > 0 || (j & 0x80) > 0) {
						position$1 -= 10;
						return
					}
					if (length < 11)
						return fromCharCode(a, b, c, d, e, f, g, h, i, j)
					let k = src[position$1++];
					if ((k & 0x80) > 0) {
						position$1 -= 11;
						return
					}
					return fromCharCode(a, b, c, d, e, f, g, h, i, j, k)
				} else {
					let i = src[position$1++];
					let j = src[position$1++];
					let k = src[position$1++];
					let l = src[position$1++];
					if ((i & 0x80) > 0 || (j & 0x80) > 0 || (k & 0x80) > 0 || (l & 0x80) > 0) {
						position$1 -= 12;
						return
					}
					if (length < 14) {
						if (length === 12)
							return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l)
						else {
							let m = src[position$1++];
							if ((m & 0x80) > 0) {
								position$1 -= 13;
								return
							}
							return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m)
						}
					} else {
						let m = src[position$1++];
						let n = src[position$1++];
						if ((m & 0x80) > 0 || (n & 0x80) > 0) {
							position$1 -= 14;
							return
						}
						if (length < 15)
							return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n)
						let o = src[position$1++];
						if ((o & 0x80) > 0) {
							position$1 -= 15;
							return
						}
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
					}
				}
			}
		}
	}

	function readOnlyJSString() {
		let token = src[position$1++];
		let length;
		if (token < 0xc0) {
			// fixstr
			length = token - 0xa0;
		} else {
			switch(token) {
				case 0xd9:
				// str 8
					length = src[position$1++];
					break
				case 0xda:
				// str 16
					length = dataView.getUint16(position$1);
					position$1 += 2;
					break
				case 0xdb:
				// str 32
					length = dataView.getUint32(position$1);
					position$1 += 4;
					break
				default:
					throw new Error('Expected string')
			}
		}
		return readStringJS(length)
	}


	function readBin(length) {
		return currentUnpackr.copyBuffers ?
			// specifically use the copying slice (not the node one)
			Uint8Array.prototype.slice.call(src, position$1, position$1 += length) :
			src.subarray(position$1, position$1 += length)
	}
	function readExt(length) {
		let type = src[position$1++];
		if (currentExtensions[type]) {
			let end;
			return currentExtensions[type](src.subarray(position$1, end = (position$1 += length)), (readPosition) => {
				position$1 = readPosition;
				try {
					return read();
				} finally {
					position$1 = end;
				}
			})
		}
		else
			throw new Error('Unknown extension type ' + type)
	}

	var keyCache = new Array(4096);
	function readKey() {
		let length = src[position$1++];
		if (length >= 0xa0 && length < 0xc0) {
			// fixstr, potentially use key cache
			length = length - 0xa0;
			if (srcStringEnd >= position$1) // if it has been extracted, must use it (and faster anyway)
				return srcString.slice(position$1 - srcStringStart, (position$1 += length) - srcStringStart)
			else if (!(srcStringEnd == 0 && srcEnd < 180))
				return readFixedString(length)
		} else { // not cacheable, go back and do a standard read
			position$1--;
			return asSafeString(read())
		}
		let key = ((length << 5) ^ (length > 1 ? dataView.getUint16(position$1) : length > 0 ? src[position$1] : 0)) & 0xfff;
		let entry = keyCache[key];
		let checkPosition = position$1;
		let end = position$1 + length - 3;
		let chunk;
		let i = 0;
		if (entry && entry.bytes == length) {
			while (checkPosition < end) {
				chunk = dataView.getUint32(checkPosition);
				if (chunk != entry[i++]) {
					checkPosition = 0x70000000;
					break
				}
				checkPosition += 4;
			}
			end += 3;
			while (checkPosition < end) {
				chunk = src[checkPosition++];
				if (chunk != entry[i++]) {
					checkPosition = 0x70000000;
					break
				}
			}
			if (checkPosition === end) {
				position$1 = checkPosition;
				return entry.string
			}
			end -= 3;
			checkPosition = position$1;
		}
		entry = [];
		keyCache[key] = entry;
		entry.bytes = length;
		while (checkPosition < end) {
			chunk = dataView.getUint32(checkPosition);
			entry.push(chunk);
			checkPosition += 4;
		}
		end += 3;
		while (checkPosition < end) {
			chunk = src[checkPosition++];
			entry.push(chunk);
		}
		// for small blocks, avoiding the overhead of the extract call is helpful
		let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
		if (string != null)
			return entry.string = string
		return entry.string = readFixedString(length)
	}

	function asSafeString(property) {
		if (typeof property === 'string') return property;
		if (typeof property === 'number') return property.toString();
		throw new Error('Invalid property type for record', typeof property);
	}
	// the registration of the record definition extension (as "r")
	const recordDefinition = (id, highByte) => {
		let structure = read().map(asSafeString); // ensure that all keys are strings and
		// that the array is mutable
		let firstByte = id;
		if (highByte !== undefined) {
			id = id < 32 ? -((highByte << 5) + id) : ((highByte << 5) + id);
			structure.highByte = highByte;
		}
		let existingStructure = currentStructures[id];
		// If it is a shared structure, we need to restore any changes after reading.
		// Also in sequential mode, we may get incomplete reads and thus errors, and we need to restore
		// to the state prior to an incomplete read in order to properly resume.
		if (existingStructure && (existingStructure.isShared || sequentialMode)) {
			(currentStructures.restoreStructures || (currentStructures.restoreStructures = []))[id] = existingStructure;
		}
		currentStructures[id] = structure;
		structure.read = createStructureReader(structure, firstByte);
		return structure.read()
	};
	currentExtensions[0] = () => {}; // notepack defines extension 0 to mean undefined, so use that as the default here
	currentExtensions[0].noBuffer = true;

	currentExtensions[0x42] = (data) => {
		// decode bigint
		let length = data.length;
		let value = BigInt(data[0] & 0x80 ? data[0] - 0x100 : data[0]);
		for (let i = 1; i < length; i++) {
			value <<= 8n;
			value += BigInt(data[i]);
		}
		return value;
	};

	let errors = { Error, TypeError, ReferenceError };
	currentExtensions[0x65] = () => {
		let data = read();
		return (errors[data[0]] || Error)(data[1])
	};

	currentExtensions[0x69] = (data) => {
		// id extension (for structured clones)
		if (currentUnpackr.structuredClone === false) throw new Error('Structured clone extension is disabled')
		let id = dataView.getUint32(position$1 - 4);
		if (!referenceMap)
			referenceMap = new Map();
		let token = src[position$1];
		let target;
		// TODO: handle Maps, Sets, and other types that can cycle; this is complicated, because you potentially need to read
		// ahead past references to record structure definitions
		if (token >= 0x90 && token < 0xa0 || token == 0xdc || token == 0xdd)
			target = [];
		else
			target = {};

		let refEntry = { target }; // a placeholder object
		referenceMap.set(id, refEntry);
		let targetProperties = read(); // read the next value as the target object to id
		if (refEntry.used) // there is a cycle, so we have to assign properties to original target
			return Object.assign(target, targetProperties)
		refEntry.target = targetProperties; // the placeholder wasn't used, replace with the deserialized one
		return targetProperties // no cycle, can just use the returned read object
	};

	currentExtensions[0x70] = (data) => {
		// pointer extension (for structured clones)
		if (currentUnpackr.structuredClone === false) throw new Error('Structured clone extension is disabled')
		let id = dataView.getUint32(position$1 - 4);
		let refEntry = referenceMap.get(id);
		refEntry.used = true;
		return refEntry.target
	};

	currentExtensions[0x73] = () => new Set(read());

	const typedArrays = ['Int8','Uint8','Uint8Clamped','Int16','Uint16','Int32','Uint32','Float32','Float64','BigInt64','BigUint64'].map(type => type + 'Array');

	let glbl = typeof globalThis === 'object' ? globalThis : window;
	currentExtensions[0x74] = (data) => {
		let typeCode = data[0];
		let typedArrayName = typedArrays[typeCode];
		if (!typedArrayName)
			throw new Error('Could not find typed array for code ' + typeCode)
		// we have to always slice/copy here to get a new ArrayBuffer that is word/byte aligned
		return new glbl[typedArrayName](Uint8Array.prototype.slice.call(data, 1).buffer)
	};
	currentExtensions[0x78] = () => {
		let data = read();
		return new RegExp(data[0], data[1])
	};
	const TEMP_BUNDLE = [];
	currentExtensions[0x62] = (data) => {
		let dataSize = (data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3];
		let dataPosition = position$1;
		position$1 += dataSize - data.length;
		bundledStrings$1 = TEMP_BUNDLE;
		bundledStrings$1 = [readOnlyJSString(), readOnlyJSString()];
		bundledStrings$1.position0 = 0;
		bundledStrings$1.position1 = 0;
		bundledStrings$1.postBundlePosition = position$1;
		position$1 = dataPosition;
		return read()
	};

	currentExtensions[0xff] = (data) => {
		// 32-bit date extension
		if (data.length == 4)
			return new Date((data[0] * 0x1000000 + (data[1] << 16) + (data[2] << 8) + data[3]) * 1000)
		else if (data.length == 8)
			return new Date(
				((data[0] << 22) + (data[1] << 14) + (data[2] << 6) + (data[3] >> 2)) / 1000000 +
				((data[3] & 0x3) * 0x100000000 + data[4] * 0x1000000 + (data[5] << 16) + (data[6] << 8) + data[7]) * 1000)
		else if (data.length == 12)// TODO: Implement support for negative
			return new Date(
				((data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3]) / 1000000 +
				(((data[4] & 0x80) ? -0x1000000000000 : 0) + data[6] * 0x10000000000 + data[7] * 0x100000000 + data[8] * 0x1000000 + (data[9] << 16) + (data[10] << 8) + data[11]) * 1000)
		else
			return new Date('invalid')
	}; // notepack defines extension 0 to mean undefined, so use that as the default here
	// registration of bulk record definition?
	// currentExtensions[0x52] = () =>

	function saveState(callback) {
		let savedSrcEnd = srcEnd;
		let savedPosition = position$1;
		let savedSrcStringStart = srcStringStart;
		let savedSrcStringEnd = srcStringEnd;
		let savedSrcString = srcString;
		let savedReferenceMap = referenceMap;
		let savedBundledStrings = bundledStrings$1;

		// TODO: We may need to revisit this if we do more external calls to user code (since it could be slow)
		let savedSrc = new Uint8Array(src.slice(0, srcEnd)); // we copy the data in case it changes while external data is processed
		let savedStructures = currentStructures;
		let savedStructuresContents = currentStructures.slice(0, currentStructures.length);
		let savedPackr = currentUnpackr;
		let savedSequentialMode = sequentialMode;
		let value = callback();
		srcEnd = savedSrcEnd;
		position$1 = savedPosition;
		srcStringStart = savedSrcStringStart;
		srcStringEnd = savedSrcStringEnd;
		srcString = savedSrcString;
		referenceMap = savedReferenceMap;
		bundledStrings$1 = savedBundledStrings;
		src = savedSrc;
		sequentialMode = savedSequentialMode;
		currentStructures = savedStructures;
		currentStructures.splice(0, currentStructures.length, ...savedStructuresContents);
		currentUnpackr = savedPackr;
		dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
		return value
	}
	function clearSource() {
		src = null;
		referenceMap = null;
		currentStructures = null;
	}

	const mult10 = new Array(147); // this is a table matching binary exponents to the multiplier to determine significant digit rounding
	for (let i = 0; i < 256; i++) {
		mult10[i] = +('1e' + Math.floor(45.15 - i * 0.30103));
	}
	var defaultUnpackr = new Unpackr({ useRecords: false });
	const unpack = defaultUnpackr.unpack;
	defaultUnpackr.unpackMultiple;
	defaultUnpackr.unpack;
	let f32Array = new Float32Array(1);
	new Uint8Array(f32Array.buffer, 0, 4);

	let textEncoder;
	try {
		textEncoder = new TextEncoder();
	} catch (error) {}
	let extensions, extensionClasses;
	const hasNodeBuffer = typeof Buffer !== 'undefined';
	const ByteArrayAllocate = hasNodeBuffer ?
		function(length) { return Buffer.allocUnsafeSlow(length) } : Uint8Array;
	const ByteArray = hasNodeBuffer ? Buffer : Uint8Array;
	const MAX_BUFFER_SIZE = hasNodeBuffer ? 0x100000000 : 0x7fd00000;
	let target, keysTarget;
	let targetView;
	let position = 0;
	let safeEnd;
	let bundledStrings = null;
	let writeStructSlots;
	const MAX_BUNDLE_SIZE = 0x5500; // maximum characters such that the encoded bytes fits in 16 bits.
	const hasNonLatin = /[\u0080-\uFFFF]/;
	const RECORD_SYMBOL = Symbol('record-id');
	class Packr extends Unpackr {
		constructor(options) {
			super(options);
			this.offset = 0;
			let start;
			let hasSharedUpdate;
			let structures;
			let referenceMap;
			let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position) {
				return target.utf8Write(string, position, 0xffffffff)
			} : (textEncoder && textEncoder.encodeInto) ?
				function(string, position) {
					return textEncoder.encodeInto(string, target.subarray(position)).written
				} : false;

			let packr = this;
			if (!options)
				options = {};
			let isSequential = options && options.sequential;
			let hasSharedStructures = options.structures || options.saveStructures;
			let maxSharedStructures = options.maxSharedStructures;
			if (maxSharedStructures == null)
				maxSharedStructures = hasSharedStructures ? 32 : 0;
			if (maxSharedStructures > 8160)
				throw new Error('Maximum maxSharedStructure is 8160')
			if (options.structuredClone && options.moreTypes == undefined) {
				this.moreTypes = true;
			}
			let maxOwnStructures = options.maxOwnStructures;
			if (maxOwnStructures == null)
				maxOwnStructures = hasSharedStructures ? 32 : 64;
			if (!this.structures && options.useRecords != false)
				this.structures = [];
			// two byte record ids for shared structures
			let useTwoByteRecords = maxSharedStructures > 32 || (maxOwnStructures + maxSharedStructures > 64);		
			let sharedLimitId = maxSharedStructures + 0x40;
			let maxStructureId = maxSharedStructures + maxOwnStructures + 0x40;
			if (maxStructureId > 8256) {
				throw new Error('Maximum maxSharedStructure + maxOwnStructure is 8192')
			}
			let recordIdsToRemove = [];
			let transitionsCount = 0;
			let serializationsSinceTransitionRebuild = 0;

			this.pack = this.encode = function(value, encodeOptions) {
				if (!target) {
					target = new ByteArrayAllocate(8192);
					targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, 8192));
					position = 0;
				}
				safeEnd = target.length - 10;
				if (safeEnd - position < 0x800) {
					// don't start too close to the end, 
					target = new ByteArrayAllocate(target.length);
					targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, target.length));
					safeEnd = target.length - 10;
					position = 0;
				} else
					position = (position + 7) & 0x7ffffff8; // Word align to make any future copying of this buffer faster
				start = position;
				if (encodeOptions & RESERVE_START_SPACE) position += (encodeOptions & 0xff);
				referenceMap = packr.structuredClone ? new Map() : null;
				if (packr.bundleStrings && typeof value !== 'string') {
					bundledStrings = [];
					bundledStrings.size = Infinity; // force a new bundle start on first string
				} else
					bundledStrings = null;
				structures = packr.structures;
				if (structures) {
					if (structures.uninitialized)
						structures = packr._mergeStructures(packr.getStructures());
					let sharedLength = structures.sharedLength || 0;
					if (sharedLength > maxSharedStructures) {
						//if (maxSharedStructures <= 32 && structures.sharedLength > 32) // TODO: could support this, but would need to update the limit ids
						throw new Error('Shared structures is larger than maximum shared structures, try increasing maxSharedStructures to ' + structures.sharedLength)
					}
					if (!structures.transitions) {
						// rebuild our structure transitions
						structures.transitions = Object.create(null);
						for (let i = 0; i < sharedLength; i++) {
							let keys = structures[i];
							if (!keys)
								continue
							let nextTransition, transition = structures.transitions;
							for (let j = 0, l = keys.length; j < l; j++) {
								let key = keys[j];
								nextTransition = transition[key];
								if (!nextTransition) {
									nextTransition = transition[key] = Object.create(null);
								}
								transition = nextTransition;
							}
							transition[RECORD_SYMBOL] = i + 0x40;
						}
						this.lastNamedStructuresLength = sharedLength;
					}
					if (!isSequential) {
						structures.nextId = sharedLength + 0x40;
					}
				}
				if (hasSharedUpdate)
					hasSharedUpdate = false;
				let encodingError;
				try {
					if (packr.randomAccessStructure && value && value.constructor && value.constructor === Object)
						writeStruct(value);
					else
						pack(value);
					let lastBundle = bundledStrings;
					if (bundledStrings)
						writeBundles(start, pack, 0);
					if (referenceMap && referenceMap.idsToInsert) {
						let idsToInsert = referenceMap.idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1);
						let i = idsToInsert.length;
						let incrementPosition = -1;
						while (lastBundle && i > 0) {
							let insertionPoint = idsToInsert[--i].offset + start;
							if (insertionPoint < (lastBundle.stringsPosition + start) && incrementPosition === -1)
								incrementPosition = 0;
							if (insertionPoint > (lastBundle.position + start)) {
								if (incrementPosition >= 0)
									incrementPosition += 6;
							} else {
								if (incrementPosition >= 0) {
									// update the bundle reference now
									targetView.setUint32(lastBundle.position + start,
										targetView.getUint32(lastBundle.position + start) + incrementPosition);
									incrementPosition = -1; // reset
								}
								lastBundle = lastBundle.previous;
								i++;
							}
						}
						if (incrementPosition >= 0 && lastBundle) {
							// update the bundle reference now
							targetView.setUint32(lastBundle.position + start,
								targetView.getUint32(lastBundle.position + start) + incrementPosition);
						}
						position += idsToInsert.length * 6;
						if (position > safeEnd)
							makeRoom(position);
						packr.offset = position;
						let serialized = insertIds(target.subarray(start, position), idsToInsert);
						referenceMap = null;
						return serialized
					}
					packr.offset = position; // update the offset so next serialization doesn't write over our buffer, but can continue writing to same buffer sequentially
					if (encodeOptions & REUSE_BUFFER_MODE) {
						target.start = start;
						target.end = position;
						return target
					}
					return target.subarray(start, position) // position can change if we call pack again in saveStructures, so we get the buffer now
				} catch(error) {
					encodingError = error;
					throw error;
				} finally {
					if (structures) {
						resetStructures();
						if (hasSharedUpdate && packr.saveStructures) {
							let sharedLength = structures.sharedLength || 0;
							// we can't rely on start/end with REUSE_BUFFER_MODE since they will (probably) change when we save
							let returnBuffer = target.subarray(start, position);
							let newSharedData = prepareStructures(structures, packr);
							if (!encodingError) { // TODO: If there is an encoding error, should make the structures as uninitialized so they get rebuilt next time
								if (packr.saveStructures(newSharedData, newSharedData.isCompatible) === false) {
									// get updated structures and try again if the update failed
									return packr.pack(value, encodeOptions)
								}
								packr.lastNamedStructuresLength = sharedLength;
								return returnBuffer
							}
						}
					}
					if (encodeOptions & RESET_BUFFER_MODE)
						position = start;
				}
			};
			const resetStructures = () => {
				if (serializationsSinceTransitionRebuild < 10)
					serializationsSinceTransitionRebuild++;
				let sharedLength = structures.sharedLength || 0;
				if (structures.length > sharedLength && !isSequential)
					structures.length = sharedLength;
				if (transitionsCount > 10000) {
					// force a rebuild occasionally after a lot of transitions so it can get cleaned up
					structures.transitions = null;
					serializationsSinceTransitionRebuild = 0;
					transitionsCount = 0;
					if (recordIdsToRemove.length > 0)
						recordIdsToRemove = [];
				} else if (recordIdsToRemove.length > 0 && !isSequential) {
					for (let i = 0, l = recordIdsToRemove.length; i < l; i++) {
						recordIdsToRemove[i][RECORD_SYMBOL] = 0;
					}
					recordIdsToRemove = [];
				}
			};
			const packArray = (value) => {
				var length = value.length;
				if (length < 0x10) {
					target[position++] = 0x90 | length;
				} else if (length < 0x10000) {
					target[position++] = 0xdc;
					target[position++] = length >> 8;
					target[position++] = length & 0xff;
				} else {
					target[position++] = 0xdd;
					targetView.setUint32(position, length);
					position += 4;
				}
				for (let i = 0; i < length; i++) {
					pack(value[i]);
				}
			};
			const pack = (value) => {
				if (position > safeEnd)
					target = makeRoom(position);

				var type = typeof value;
				var length;
				if (type === 'string') {
					let strLength = value.length;
					if (bundledStrings && strLength >= 4 && strLength < 0x1000) {
						if ((bundledStrings.size += strLength) > MAX_BUNDLE_SIZE) {
							let extStart;
							let maxBytes = (bundledStrings[0] ? bundledStrings[0].length * 3 + bundledStrings[1].length : 0) + 10;
							if (position + maxBytes > safeEnd)
								target = makeRoom(position + maxBytes);
							let lastBundle;
							if (bundledStrings.position) { // here we use the 0x62 extension to write the last bundle and reserve space for the reference pointer to the next/current bundle
								lastBundle = bundledStrings;
								target[position] = 0xc8; // ext 16
								position += 3; // reserve for the writing bundle size
								target[position++] = 0x62; // 'b'
								extStart = position - start;
								position += 4; // reserve for writing bundle reference
								writeBundles(start, pack, 0); // write the last bundles
								targetView.setUint16(extStart + start - 3, position - start - extStart);
							} else { // here we use the 0x62 extension just to reserve the space for the reference pointer to the bundle (will be updated once the bundle is written)
								target[position++] = 0xd6; // fixext 4
								target[position++] = 0x62; // 'b'
								extStart = position - start;
								position += 4; // reserve for writing bundle reference
							}
							bundledStrings = ['', '']; // create new ones
							bundledStrings.previous = lastBundle;
							bundledStrings.size = 0;
							bundledStrings.position = extStart;
						}
						let twoByte = hasNonLatin.test(value);
						bundledStrings[twoByte ? 0 : 1] += value;
						target[position++] = 0xc1;
						pack(twoByte ? -strLength : strLength);
						return
					}
					let headerSize;
					// first we estimate the header size, so we can write to the correct location
					if (strLength < 0x20) {
						headerSize = 1;
					} else if (strLength < 0x100) {
						headerSize = 2;
					} else if (strLength < 0x10000) {
						headerSize = 3;
					} else {
						headerSize = 5;
					}
					let maxBytes = strLength * 3;
					if (position + maxBytes > safeEnd)
						target = makeRoom(position + maxBytes);

					if (strLength < 0x40 || !encodeUtf8) {
						let i, c1, c2, strPosition = position + headerSize;
						for (i = 0; i < strLength; i++) {
							c1 = value.charCodeAt(i);
							if (c1 < 0x80) {
								target[strPosition++] = c1;
							} else if (c1 < 0x800) {
								target[strPosition++] = c1 >> 6 | 0xc0;
								target[strPosition++] = c1 & 0x3f | 0x80;
							} else if (
								(c1 & 0xfc00) === 0xd800 &&
								((c2 = value.charCodeAt(i + 1)) & 0xfc00) === 0xdc00
							) {
								c1 = 0x10000 + ((c1 & 0x03ff) << 10) + (c2 & 0x03ff);
								i++;
								target[strPosition++] = c1 >> 18 | 0xf0;
								target[strPosition++] = c1 >> 12 & 0x3f | 0x80;
								target[strPosition++] = c1 >> 6 & 0x3f | 0x80;
								target[strPosition++] = c1 & 0x3f | 0x80;
							} else {
								target[strPosition++] = c1 >> 12 | 0xe0;
								target[strPosition++] = c1 >> 6 & 0x3f | 0x80;
								target[strPosition++] = c1 & 0x3f | 0x80;
							}
						}
						length = strPosition - position - headerSize;
					} else {
						length = encodeUtf8(value, position + headerSize);
					}

					if (length < 0x20) {
						target[position++] = 0xa0 | length;
					} else if (length < 0x100) {
						if (headerSize < 2) {
							target.copyWithin(position + 2, position + 1, position + 1 + length);
						}
						target[position++] = 0xd9;
						target[position++] = length;
					} else if (length < 0x10000) {
						if (headerSize < 3) {
							target.copyWithin(position + 3, position + 2, position + 2 + length);
						}
						target[position++] = 0xda;
						target[position++] = length >> 8;
						target[position++] = length & 0xff;
					} else {
						if (headerSize < 5) {
							target.copyWithin(position + 5, position + 3, position + 3 + length);
						}
						target[position++] = 0xdb;
						targetView.setUint32(position, length);
						position += 4;
					}
					position += length;
				} else if (type === 'number') {
					if (value >>> 0 === value) {// positive integer, 32-bit or less
						// positive uint
						if (value < 0x20 || (value < 0x80 && this.useRecords === false) || (value < 0x40 && !this.randomAccessStructure)) {
							target[position++] = value;
						} else if (value < 0x100) {
							target[position++] = 0xcc;
							target[position++] = value;
						} else if (value < 0x10000) {
							target[position++] = 0xcd;
							target[position++] = value >> 8;
							target[position++] = value & 0xff;
						} else {
							target[position++] = 0xce;
							targetView.setUint32(position, value);
							position += 4;
						}
					} else if (value >> 0 === value) { // negative integer
						if (value >= -0x20) {
							target[position++] = 0x100 + value;
						} else if (value >= -0x80) {
							target[position++] = 0xd0;
							target[position++] = value + 0x100;
						} else if (value >= -0x8000) {
							target[position++] = 0xd1;
							targetView.setInt16(position, value);
							position += 2;
						} else {
							target[position++] = 0xd2;
							targetView.setInt32(position, value);
							position += 4;
						}
					} else {
						let useFloat32;
						if ((useFloat32 = this.useFloat32) > 0 && value < 0x100000000 && value >= -0x80000000) {
							target[position++] = 0xca;
							targetView.setFloat32(position, value);
							let xShifted;
							if (useFloat32 < 4 ||
									// this checks for rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
									((xShifted = value * mult10[((target[position] & 0x7f) << 1) | (target[position + 1] >> 7)]) >> 0) === xShifted) {
								position += 4;
								return
							} else
								position--; // move back into position for writing a double
						}
						target[position++] = 0xcb;
						targetView.setFloat64(position, value);
						position += 8;
					}
				} else if (type === 'object' || type === 'function') {
					if (!value)
						target[position++] = 0xc0;
					else {
						if (referenceMap) {
							let referee = referenceMap.get(value);
							if (referee) {
								if (!referee.id) {
									let idsToInsert = referenceMap.idsToInsert || (referenceMap.idsToInsert = []);
									referee.id = idsToInsert.push(referee);
								}
								target[position++] = 0xd6; // fixext 4
								target[position++] = 0x70; // "p" for pointer
								targetView.setUint32(position, referee.id);
								position += 4;
								return
							} else 
								referenceMap.set(value, { offset: position - start });
						}
						let constructor = value.constructor;
						if (constructor === Object) {
							writeObject(value, true);
						} else if (constructor === Array) {
							packArray(value);
						} else if (constructor === Map) {
							if (this.mapAsEmptyObject) target[position++] = 0x80;
							else {
								length = value.size;
								if (length < 0x10) {
									target[position++] = 0x80 | length;
								} else if (length < 0x10000) {
									target[position++] = 0xde;
									target[position++] = length >> 8;
									target[position++] = length & 0xff;
								} else {
									target[position++] = 0xdf;
									targetView.setUint32(position, length);
									position += 4;
								}
								for (let [key, entryValue] of value) {
									pack(key);
									pack(entryValue);
								}
							}
						} else {	
							for (let i = 0, l = extensions.length; i < l; i++) {
								let extensionClass = extensionClasses[i];
								if (value instanceof extensionClass) {
									let extension = extensions[i];
									if (extension.write) {
										if (extension.type) {
											target[position++] = 0xd4; // one byte "tag" extension
											target[position++] = extension.type;
											target[position++] = 0;
										}
										let writeResult = extension.write.call(this, value);
										if (writeResult === value) { // avoid infinite recursion
											if (Array.isArray(value)) {
												packArray(value);
											} else {
												writeObject(value);
											}
										} else {
											pack(writeResult);
										}
										return
									}
									let currentTarget = target;
									let currentTargetView = targetView;
									let currentPosition = position;
									target = null;
									let result;
									try {
										result = extension.pack.call(this, value, (size) => {
											// restore target and use it
											target = currentTarget;
											currentTarget = null;
											position += size;
											if (position > safeEnd)
												makeRoom(position);
											return {
												target, targetView, position: position - size
											}
										}, pack);
									} finally {
										// restore current target information (unless already restored)
										if (currentTarget) {
											target = currentTarget;
											targetView = currentTargetView;
											position = currentPosition;
											safeEnd = target.length - 10;
										}
									}
									if (result) {
										if (result.length + position > safeEnd)
											makeRoom(result.length + position);
										position = writeExtensionData(result, target, position, extension.type);
									}
									return
								}
							}
							// check isArray after extensions, because extensions can extend Array
							if (Array.isArray(value)) {
								packArray(value);
							} else {
								// use this as an alternate mechanism for expressing how to serialize
								if (value.toJSON) {
									const json = value.toJSON();
									// if for some reason value.toJSON returns itself it'll loop forever
									if (json !== value)
										return pack(json)
								}
								
								// if there is a writeFunction, use it, otherwise just encode as undefined
								if (type === 'function')
									return pack(this.writeFunction && this.writeFunction(value));
								
								// no extension found, write as object
								writeObject(value, !value.hasOwnProperty); // if it doesn't have hasOwnProperty, don't do hasOwnProperty checks
							}
						}
					}
				} else if (type === 'boolean') {
					target[position++] = value ? 0xc3 : 0xc2;
				} else if (type === 'bigint') {
					if (value < (BigInt(1)<<BigInt(63)) && value >= -(BigInt(1)<<BigInt(63))) {
						// use a signed int as long as it fits
						target[position++] = 0xd3;
						targetView.setBigInt64(position, value);
					} else if (value < (BigInt(1)<<BigInt(64)) && value > 0) {
						// if we can fit an unsigned int, use that
						target[position++] = 0xcf;
						targetView.setBigUint64(position, value);
					} else {
						// overflow
						if (this.largeBigIntToFloat) {
							target[position++] = 0xcb;
							targetView.setFloat64(position, Number(value));
						} else if (this.useBigIntExtension && value < 2n**(1023n) && value > -(2n**(1023n))) {
							target[position++] = 0xc7;
							position++;
							target[position++] = 0x42; // "B" for BigInt
							let bytes = [];
							let alignedSign;
							do {
								let byte = value & 0xffn;
								alignedSign = (byte & 0x80n) === (value < 0n ? 0x80n : 0n);
								bytes.push(byte);
								value >>= 8n;
							} while (!((value === 0n || value === -1n) && alignedSign));
							target[position-2] = bytes.length;
							for (let i = bytes.length; i > 0;) {
								target[position++] = Number(bytes[--i]);
							}
							return
						} else {
							throw new RangeError(value + ' was too large to fit in MessagePack 64-bit integer format, use' +
								' useBigIntExtension or set largeBigIntToFloat to convert to float-64')
						}
					}
					position += 8;
				} else if (type === 'undefined') {
					if (this.encodeUndefinedAsNil)
						target[position++] = 0xc0;
					else {
						target[position++] = 0xd4; // a number of implementations use fixext1 with type 0, data 0 to denote undefined, so we follow suite
						target[position++] = 0;
						target[position++] = 0;
					}
				} else {
					throw new Error('Unknown type: ' + type)
				}
			};

			const writePlainObject = (this.variableMapSize || this.coercibleKeyAsNumber) ? (object) => {
				// this method is slightly slower, but generates "preferred serialization" (optimally small for smaller objects)
				let keys = Object.keys(object);
				let length = keys.length;
				if (length < 0x10) {
					target[position++] = 0x80 | length;
				} else if (length < 0x10000) {
					target[position++] = 0xde;
					target[position++] = length >> 8;
					target[position++] = length & 0xff;
				} else {
					target[position++] = 0xdf;
					targetView.setUint32(position, length);
					position += 4;
				}
				let key;
				if (this.coercibleKeyAsNumber) {
					for (let i = 0; i < length; i++) {
						key = keys[i];
						let num = Number(key);
						pack(isNaN(num) ? key : num);
						pack(object[key]);
					}

				} else {
					for (let i = 0; i < length; i++) {
						pack(key = keys[i]);
						pack(object[key]);
					}
				}
			} :
			(object, safePrototype) => {
				target[position++] = 0xde; // always using map 16, so we can preallocate and set the length afterwards
				let objectOffset = position - start;
				position += 2;
				let size = 0;
				for (let key in object) {
					if (safePrototype || object.hasOwnProperty(key)) {
						pack(key);
						pack(object[key]);
						size++;
					}
				}
				target[objectOffset++ + start] = size >> 8;
				target[objectOffset + start] = size & 0xff;
			};

			const writeRecord = this.useRecords === false ? writePlainObject :
			(options.progressiveRecords && !useTwoByteRecords) ?  // this is about 2% faster for highly stable structures, since it only requires one for-in loop (but much more expensive when new structure needs to be written)
			(object, safePrototype) => {
				let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null));
				let objectOffset = position++ - start;
				let wroteKeys;
				for (let key in object) {
					if (safePrototype || object.hasOwnProperty(key)) {
						nextTransition = transition[key];
						if (nextTransition)
							transition = nextTransition;
						else {
							// record doesn't exist, create full new record and insert it
							let keys = Object.keys(object);
							let lastTransition = transition;
							transition = structures.transitions;
							let newTransitions = 0;
							for (let i = 0, l = keys.length; i < l; i++) {
								let key = keys[i];
								nextTransition = transition[key];
								if (!nextTransition) {
									nextTransition = transition[key] = Object.create(null);
									newTransitions++;
								}
								transition = nextTransition;
							}
							if (objectOffset + start + 1 == position) {
								// first key, so we don't need to insert, we can just write record directly
								position--;
								newRecord(transition, keys, newTransitions);
							} else // otherwise we need to insert the record, moving existing data after the record
								insertNewRecord(transition, keys, objectOffset, newTransitions);
							wroteKeys = true;
							transition = lastTransition[key];
						}
						pack(object[key]);
					}
				}
				if (!wroteKeys) {
					let recordId = transition[RECORD_SYMBOL];
					if (recordId)
						target[objectOffset + start] = recordId;
					else
						insertNewRecord(transition, Object.keys(object), objectOffset, 0);
				}
			} :
			(object, safePrototype) => {
				let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null));
				let newTransitions = 0;
				for (let key in object) if (safePrototype || object.hasOwnProperty(key)) {
					nextTransition = transition[key];
					if (!nextTransition) {
						nextTransition = transition[key] = Object.create(null);
						newTransitions++;
					}
					transition = nextTransition;
				}
				let recordId = transition[RECORD_SYMBOL];
				if (recordId) {
					if (recordId >= 0x60 && useTwoByteRecords) {
						target[position++] = ((recordId -= 0x60) & 0x1f) + 0x60;
						target[position++] = recordId >> 5;
					} else
						target[position++] = recordId;
				} else {
					newRecord(transition, transition.__keys__ || Object.keys(object), newTransitions);
				}
				// now write the values
				for (let key in object)
					if (safePrototype || object.hasOwnProperty(key)) {
						pack(object[key]);
					}
			};

			// craete reference to useRecords if useRecords is a function
			const checkUseRecords = typeof this.useRecords == 'function' && this.useRecords;
			
			const writeObject = checkUseRecords ? (object, safePrototype) => {
				checkUseRecords(object) ? writeRecord(object,safePrototype) : writePlainObject(object,safePrototype);
			} : writeRecord;

			const makeRoom = (end) => {
				let newSize;
				if (end > 0x1000000) {
					// special handling for really large buffers
					if ((end - start) > MAX_BUFFER_SIZE)
						throw new Error('Packed buffer would be larger than maximum buffer size')
					newSize = Math.min(MAX_BUFFER_SIZE,
						Math.round(Math.max((end - start) * (end > 0x4000000 ? 1.25 : 2), 0x400000) / 0x1000) * 0x1000);
				} else // faster handling for smaller buffers
					newSize = ((Math.max((end - start) << 2, target.length - 1) >> 12) + 1) << 12;
				let newBuffer = new ByteArrayAllocate(newSize);
				targetView = newBuffer.dataView || (newBuffer.dataView = new DataView(newBuffer.buffer, 0, newSize));
				end = Math.min(end, target.length);
				if (target.copy)
					target.copy(newBuffer, 0, start, end);
				else
					newBuffer.set(target.slice(start, end));
				position -= start;
				start = 0;
				safeEnd = newBuffer.length - 10;
				return target = newBuffer
			};
			const newRecord = (transition, keys, newTransitions) => {
				let recordId = structures.nextId;
				if (!recordId)
					recordId = 0x40;
				if (recordId < sharedLimitId && this.shouldShareStructure && !this.shouldShareStructure(keys)) {
					recordId = structures.nextOwnId;
					if (!(recordId < maxStructureId))
						recordId = sharedLimitId;
					structures.nextOwnId = recordId + 1;
				} else {
					if (recordId >= maxStructureId)// cycle back around
						recordId = sharedLimitId;
					structures.nextId = recordId + 1;
				}
				let highByte = keys.highByte = recordId >= 0x60 && useTwoByteRecords ? (recordId - 0x60) >> 5 : -1;
				transition[RECORD_SYMBOL] = recordId;
				transition.__keys__ = keys;
				structures[recordId - 0x40] = keys;

				if (recordId < sharedLimitId) {
					keys.isShared = true;
					structures.sharedLength = recordId - 0x3f;
					hasSharedUpdate = true;
					if (highByte >= 0) {
						target[position++] = (recordId & 0x1f) + 0x60;
						target[position++] = highByte;
					} else {
						target[position++] = recordId;
					}
				} else {
					if (highByte >= 0) {
						target[position++] = 0xd5; // fixext 2
						target[position++] = 0x72; // "r" record defintion extension type
						target[position++] = (recordId & 0x1f) + 0x60;
						target[position++] = highByte;
					} else {
						target[position++] = 0xd4; // fixext 1
						target[position++] = 0x72; // "r" record defintion extension type
						target[position++] = recordId;
					}

					if (newTransitions)
						transitionsCount += serializationsSinceTransitionRebuild * newTransitions;
					// record the removal of the id, we can maintain our shared structure
					if (recordIdsToRemove.length >= maxOwnStructures)
						recordIdsToRemove.shift()[RECORD_SYMBOL] = 0; // we are cycling back through, and have to remove old ones
					recordIdsToRemove.push(transition);
					pack(keys);
				}
			};
			const insertNewRecord = (transition, keys, insertionOffset, newTransitions) => {
				let mainTarget = target;
				let mainPosition = position;
				let mainSafeEnd = safeEnd;
				let mainStart = start;
				target = keysTarget;
				position = 0;
				start = 0;
				if (!target)
					keysTarget = target = new ByteArrayAllocate(8192);
				safeEnd = target.length - 10;
				newRecord(transition, keys, newTransitions);
				keysTarget = target;
				let keysPosition = position;
				target = mainTarget;
				position = mainPosition;
				safeEnd = mainSafeEnd;
				start = mainStart;
				if (keysPosition > 1) {
					let newEnd = position + keysPosition - 1;
					if (newEnd > safeEnd)
						makeRoom(newEnd);
					let insertionPosition = insertionOffset + start;
					target.copyWithin(insertionPosition + keysPosition, insertionPosition + 1, position);
					target.set(keysTarget.slice(0, keysPosition), insertionPosition);
					position = newEnd;
				} else {
					target[insertionOffset + start] = keysTarget[0];
				}
			};
			const writeStruct = (object, safePrototype) => {
				let newPosition = writeStructSlots(object, target, start, position, structures, makeRoom, (value, newPosition, notifySharedUpdate) => {
					if (notifySharedUpdate)
						return hasSharedUpdate = true;
					position = newPosition;
					let startTarget = target;
					pack(value);
					resetStructures();
					if (startTarget !== target) {
						return { position, targetView, target }; // indicate the buffer was re-allocated
					}
					return position;
				}, this);
				if (newPosition === 0) // bail and go to a msgpack object
					return writeObject(object, true);
				position = newPosition;
			};
		}
		useBuffer(buffer) {
			// this means we are finished using our own buffer and we can write over it safely
			target = buffer;
			targetView = new DataView(target.buffer, target.byteOffset, target.byteLength);
			position = 0;
		}
		clearSharedData() {
			if (this.structures)
				this.structures = [];
			if (this.typedStructs)
				this.typedStructs = [];
		}
	}

	extensionClasses = [ Date, Set, Error, RegExp, ArrayBuffer, Object.getPrototypeOf(Uint8Array.prototype).constructor /*TypedArray*/, C1Type ];
	extensions = [{
		pack(date, allocateForWrite, pack) {
			let seconds = date.getTime() / 1000;
			if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 0x100000000) {
				// Timestamp 32
				let { target, targetView, position} = allocateForWrite(6);
				target[position++] = 0xd6;
				target[position++] = 0xff;
				targetView.setUint32(position, seconds);
			} else if (seconds > 0 && seconds < 0x100000000) {
				// Timestamp 64
				let { target, targetView, position} = allocateForWrite(10);
				target[position++] = 0xd7;
				target[position++] = 0xff;
				targetView.setUint32(position, date.getMilliseconds() * 4000000 + ((seconds / 1000 / 0x100000000) >> 0));
				targetView.setUint32(position + 4, seconds);
			} else if (isNaN(seconds)) {
				if (this.onInvalidDate) {
					allocateForWrite(0);
					return pack(this.onInvalidDate())
				}
				// Intentionally invalid timestamp
				let { target, targetView, position} = allocateForWrite(3);
				target[position++] = 0xd4;
				target[position++] = 0xff;
				target[position++] = 0xff;
			} else {
				// Timestamp 96
				let { target, targetView, position} = allocateForWrite(15);
				target[position++] = 0xc7;
				target[position++] = 12;
				target[position++] = 0xff;
				targetView.setUint32(position, date.getMilliseconds() * 1000000);
				targetView.setBigInt64(position + 4, BigInt(Math.floor(seconds)));
			}
		}
	}, {
		pack(set, allocateForWrite, pack) {
			if (this.setAsEmptyObject) {
				allocateForWrite(0);
				return pack({})
			}
			let array = Array.from(set);
			let { target, position} = allocateForWrite(this.moreTypes ? 3 : 0);
			if (this.moreTypes) {
				target[position++] = 0xd4;
				target[position++] = 0x73; // 's' for Set
				target[position++] = 0;
			}
			pack(array);
		}
	}, {
		pack(error, allocateForWrite, pack) {
			let { target, position} = allocateForWrite(this.moreTypes ? 3 : 0);
			if (this.moreTypes) {
				target[position++] = 0xd4;
				target[position++] = 0x65; // 'e' for error
				target[position++] = 0;
			}
			pack([ error.name, error.message ]);
		}
	}, {
		pack(regex, allocateForWrite, pack) {
			let { target, position} = allocateForWrite(this.moreTypes ? 3 : 0);
			if (this.moreTypes) {
				target[position++] = 0xd4;
				target[position++] = 0x78; // 'x' for regeXp
				target[position++] = 0;
			}
			pack([ regex.source, regex.flags ]);
		}
	}, {
		pack(arrayBuffer, allocateForWrite) {
			if (this.moreTypes)
				writeExtBuffer(arrayBuffer, 0x10, allocateForWrite);
			else
				writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite);
		}
	}, {
		pack(typedArray, allocateForWrite) {
			let constructor = typedArray.constructor;
			if (constructor !== ByteArray && this.moreTypes)
				writeExtBuffer(typedArray, typedArrays.indexOf(constructor.name), allocateForWrite);
			else
				writeBuffer(typedArray, allocateForWrite);
		}
	}, {
		pack(c1, allocateForWrite) { // specific 0xC1 object
			let { target, position} = allocateForWrite(1);
			target[position] = 0xc1;
		}
	}];

	function writeExtBuffer(typedArray, type, allocateForWrite, encode) {
		let length = typedArray.byteLength;
		if (length + 1 < 0x100) {
			var { target, position } = allocateForWrite(4 + length);
			target[position++] = 0xc7;
			target[position++] = length + 1;
		} else if (length + 1 < 0x10000) {
			var { target, position } = allocateForWrite(5 + length);
			target[position++] = 0xc8;
			target[position++] = (length + 1) >> 8;
			target[position++] = (length + 1) & 0xff;
		} else {
			var { target, position, targetView } = allocateForWrite(7 + length);
			target[position++] = 0xc9;
			targetView.setUint32(position, length + 1); // plus one for the type byte
			position += 4;
		}
		target[position++] = 0x74; // "t" for typed array
		target[position++] = type;
		target.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength), position);
	}
	function writeBuffer(buffer, allocateForWrite) {
		let length = buffer.byteLength;
		var target, position;
		if (length < 0x100) {
			var { target, position } = allocateForWrite(length + 2);
			target[position++] = 0xc4;
			target[position++] = length;
		} else if (length < 0x10000) {
			var { target, position } = allocateForWrite(length + 3);
			target[position++] = 0xc5;
			target[position++] = length >> 8;
			target[position++] = length & 0xff;
		} else {
			var { target, position, targetView } = allocateForWrite(length + 5);
			target[position++] = 0xc6;
			targetView.setUint32(position, length);
			position += 4;
		}
		target.set(buffer, position);
	}

	function writeExtensionData(result, target, position, type) {
		let length = result.length;
		switch (length) {
			case 1:
				target[position++] = 0xd4;
				break
			case 2:
				target[position++] = 0xd5;
				break
			case 4:
				target[position++] = 0xd6;
				break
			case 8:
				target[position++] = 0xd7;
				break
			case 16:
				target[position++] = 0xd8;
				break
			default:
				if (length < 0x100) {
					target[position++] = 0xc7;
					target[position++] = length;
				} else if (length < 0x10000) {
					target[position++] = 0xc8;
					target[position++] = length >> 8;
					target[position++] = length & 0xff;
				} else {
					target[position++] = 0xc9;
					target[position++] = length >> 24;
					target[position++] = (length >> 16) & 0xff;
					target[position++] = (length >> 8) & 0xff;
					target[position++] = length & 0xff;
				}
		}
		target[position++] = type;
		target.set(result, position);
		position += length;
		return position
	}

	function insertIds(serialized, idsToInsert) {
		// insert the ids that need to be referenced for structured clones
		let nextId;
		let distanceToMove = idsToInsert.length * 6;
		let lastEnd = serialized.length - distanceToMove;
		while (nextId = idsToInsert.pop()) {
			let offset = nextId.offset;
			let id = nextId.id;
			serialized.copyWithin(offset + distanceToMove, offset, lastEnd);
			distanceToMove -= 6;
			let position = offset + distanceToMove;
			serialized[position++] = 0xd6;
			serialized[position++] = 0x69; // 'i'
			serialized[position++] = id >> 24;
			serialized[position++] = (id >> 16) & 0xff;
			serialized[position++] = (id >> 8) & 0xff;
			serialized[position++] = id & 0xff;
			lastEnd = offset;
		}
		return serialized
	}

	function writeBundles(start, pack, incrementPosition) {
		if (bundledStrings.length > 0) {
			targetView.setUint32(bundledStrings.position + start, position + incrementPosition - bundledStrings.position - start);
			bundledStrings.stringsPosition = position - start;
			let writeStrings = bundledStrings;
			bundledStrings = null;
			pack(writeStrings[0]);
			pack(writeStrings[1]);
		}
	}
	function prepareStructures(structures, packr) {
		structures.isCompatible = (existingStructures) => {
			let compatible = !existingStructures || ((packr.lastNamedStructuresLength || 0) === existingStructures.length);
			if (!compatible) // we want to merge these existing structures immediately since we already have it and we are in the right transaction
				packr._mergeStructures(existingStructures);
			return compatible;
		};
		return structures
	}

	let defaultPackr = new Packr({ useRecords: false });
	defaultPackr.pack;
	defaultPackr.pack;
	const REUSE_BUFFER_MODE = 512;
	const RESET_BUFFER_MODE = 1024;
	const RESERVE_START_SPACE = 2048;

	// DEFLATE is a complex format; to read this code, you should probably check the RFC first:
	// https://tools.ietf.org/html/rfc1951
	// You may also wish to take a look at the guide I made about this program:
	// https://gist.github.com/101arrowz/253f31eb5abc3d9275ab943003ffecad
	// Some of the following code is similar to that of UZIP.js:
	// https://github.com/photopea/UZIP.js
	// However, the vast majority of the codebase has diverged from UZIP.js to increase performance and reduce bundle size.
	// Sometimes 0 will appear where -1 would be more appropriate. This is because using a uint
	// is better for memory in most engines (I *think*).

	// aliases for shorter compressed code (most minifers don't do this)
	var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
	// fixed length extra bits
	var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
	// fixed distance extra bits
	var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
	// code length index map
	var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
	// get base, reverse index map from extra bits
	var freb = function (eb, start) {
	    var b = new u16(31);
	    for (var i = 0; i < 31; ++i) {
	        b[i] = start += 1 << eb[i - 1];
	    }
	    // numbers here are at max 18 bits
	    var r = new i32(b[30]);
	    for (var i = 1; i < 30; ++i) {
	        for (var j = b[i]; j < b[i + 1]; ++j) {
	            r[j] = ((j - b[i]) << 5) | i;
	        }
	    }
	    return { b: b, r: r };
	};
	var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
	// we can ignore the fact that the other numbers are wrong; they never happen anyway
	fl[28] = 258, revfl[258] = 28;
	var _b = freb(fdeb, 0), fd = _b.b;
	// map of value to reverse (assuming 16 bits)
	var rev = new u16(32768);
	for (var i = 0; i < 32768; ++i) {
	    // reverse table algorithm from SO
	    var x = ((i & 0xAAAA) >> 1) | ((i & 0x5555) << 1);
	    x = ((x & 0xCCCC) >> 2) | ((x & 0x3333) << 2);
	    x = ((x & 0xF0F0) >> 4) | ((x & 0x0F0F) << 4);
	    rev[i] = (((x & 0xFF00) >> 8) | ((x & 0x00FF) << 8)) >> 1;
	}
	// create huffman tree from u8 "map": index -> code length for code index
	// mb (max bits) must be at most 15
	// TODO: optimize/split up?
	var hMap = (function (cd, mb, r) {
	    var s = cd.length;
	    // index
	    var i = 0;
	    // u16 "map": index -> # of codes with bit length = index
	    var l = new u16(mb);
	    // length of cd must be 288 (total # of codes)
	    for (; i < s; ++i) {
	        if (cd[i])
	            ++l[cd[i] - 1];
	    }
	    // u16 "map": index -> minimum code for bit length = index
	    var le = new u16(mb);
	    for (i = 1; i < mb; ++i) {
	        le[i] = (le[i - 1] + l[i - 1]) << 1;
	    }
	    var co;
	    if (r) {
	        // u16 "map": index -> number of actual bits, symbol for code
	        co = new u16(1 << mb);
	        // bits to remove for reverser
	        var rvb = 15 - mb;
	        for (i = 0; i < s; ++i) {
	            // ignore 0 lengths
	            if (cd[i]) {
	                // num encoding both symbol and bits read
	                var sv = (i << 4) | cd[i];
	                // free bits
	                var r_1 = mb - cd[i];
	                // start value
	                var v = le[cd[i] - 1]++ << r_1;
	                // m is end value
	                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
	                    // every 16 bit value starting with the code yields the same result
	                    co[rev[v] >> rvb] = sv;
	                }
	            }
	        }
	    }
	    else {
	        co = new u16(s);
	        for (i = 0; i < s; ++i) {
	            if (cd[i]) {
	                co[i] = rev[le[cd[i] - 1]++] >> (15 - cd[i]);
	            }
	        }
	    }
	    return co;
	});
	// fixed length tree
	var flt = new u8(288);
	for (var i = 0; i < 144; ++i)
	    flt[i] = 8;
	for (var i = 144; i < 256; ++i)
	    flt[i] = 9;
	for (var i = 256; i < 280; ++i)
	    flt[i] = 7;
	for (var i = 280; i < 288; ++i)
	    flt[i] = 8;
	// fixed distance tree
	var fdt = new u8(32);
	for (var i = 0; i < 32; ++i)
	    fdt[i] = 5;
	// fixed length map
	var flrm = /*#__PURE__*/ hMap(flt, 9, 1);
	// fixed distance map
	var fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
	// find max of array
	var max = function (a) {
	    var m = a[0];
	    for (var i = 1; i < a.length; ++i) {
	        if (a[i] > m)
	            m = a[i];
	    }
	    return m;
	};
	// read d, starting at bit p and mask with m
	var bits = function (d, p, m) {
	    var o = (p / 8) | 0;
	    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
	};
	// read d, starting at bit p continuing for at least 16 bits
	var bits16 = function (d, p) {
	    var o = (p / 8) | 0;
	    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
	};
	// get end of byte
	var shft = function (p) { return ((p + 7) / 8) | 0; };
	// typed array slice - allows garbage collector to free original reference,
	// while being more compatible than .slice
	var slc = function (v, s, e) {
	    if (s == null || s < 0)
	        s = 0;
	    if (e == null || e > v.length)
	        e = v.length;
	    // can't use .constructor in case user-supplied
	    return new u8(v.subarray(s, e));
	};
	// error codes
	var ec = [
	    'unexpected EOF',
	    'invalid block type',
	    'invalid length/literal',
	    'invalid distance',
	    'stream finished',
	    'no stream handler',
	    ,
	    'no callback',
	    'invalid UTF-8 data',
	    'extra field too long',
	    'date not in range 1980-2099',
	    'filename too long',
	    'stream finishing',
	    'invalid zip data'
	    // determined by unknown compression method
	];
	var err = function (ind, msg, nt) {
	    var e = new Error(msg || ec[ind]);
	    e.code = ind;
	    if (Error.captureStackTrace)
	        Error.captureStackTrace(e, err);
	    if (!nt)
	        throw e;
	    return e;
	};
	// expands raw DEFLATE data
	var inflt = function (dat, st, buf, dict) {
	    // source length       dict length
	    var sl = dat.length, dl = dict ? dict.length : 0;
	    if (!sl || st.f && !st.l)
	        return buf || new u8(0);
	    var noBuf = !buf;
	    // have to estimate size
	    var resize = noBuf || st.i != 2;
	    // no state
	    var noSt = st.i;
	    // Assumes roughly 33% compression ratio average
	    if (noBuf)
	        buf = new u8(sl * 3);
	    // ensure buffer can fit at least l elements
	    var cbuf = function (l) {
	        var bl = buf.length;
	        // need to increase size to fit
	        if (l > bl) {
	            // Double or set to necessary, whichever is greater
	            var nbuf = new u8(Math.max(bl * 2, l));
	            nbuf.set(buf);
	            buf = nbuf;
	        }
	    };
	    //  last chunk         bitpos           bytes
	    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
	    // total bits
	    var tbts = sl * 8;
	    do {
	        if (!lm) {
	            // BFINAL - this is only 1 when last chunk is next
	            final = bits(dat, pos, 1);
	            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
	            var type = bits(dat, pos + 1, 3);
	            pos += 3;
	            if (!type) {
	                // go to end of byte boundary
	                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
	                if (t > sl) {
	                    if (noSt)
	                        err(0);
	                    break;
	                }
	                // ensure size
	                if (resize)
	                    cbuf(bt + l);
	                // Copy over uncompressed data
	                buf.set(dat.subarray(s, t), bt);
	                // Get new bitpos, update byte count
	                st.b = bt += l, st.p = pos = t * 8, st.f = final;
	                continue;
	            }
	            else if (type == 1)
	                lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
	            else if (type == 2) {
	                //  literal                            lengths
	                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
	                var tl = hLit + bits(dat, pos + 5, 31) + 1;
	                pos += 14;
	                // length+distance tree
	                var ldt = new u8(tl);
	                // code length tree
	                var clt = new u8(19);
	                for (var i = 0; i < hcLen; ++i) {
	                    // use index map to get real code
	                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
	                }
	                pos += hcLen * 3;
	                // code lengths bits
	                var clb = max(clt), clbmsk = (1 << clb) - 1;
	                // code lengths map
	                var clm = hMap(clt, clb, 1);
	                for (var i = 0; i < tl;) {
	                    var r = clm[bits(dat, pos, clbmsk)];
	                    // bits read
	                    pos += r & 15;
	                    // symbol
	                    var s = r >> 4;
	                    // code length to copy
	                    if (s < 16) {
	                        ldt[i++] = s;
	                    }
	                    else {
	                        //  copy   count
	                        var c = 0, n = 0;
	                        if (s == 16)
	                            n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
	                        else if (s == 17)
	                            n = 3 + bits(dat, pos, 7), pos += 3;
	                        else if (s == 18)
	                            n = 11 + bits(dat, pos, 127), pos += 7;
	                        while (n--)
	                            ldt[i++] = c;
	                    }
	                }
	                //    length tree                 distance tree
	                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
	                // max length bits
	                lbt = max(lt);
	                // max dist bits
	                dbt = max(dt);
	                lm = hMap(lt, lbt, 1);
	                dm = hMap(dt, dbt, 1);
	            }
	            else
	                err(1);
	            if (pos > tbts) {
	                if (noSt)
	                    err(0);
	                break;
	            }
	        }
	        // Make sure the buffer can hold this + the largest possible addition
	        // Maximum chunk size (practically, theoretically infinite) is 2^17
	        if (resize)
	            cbuf(bt + 131072);
	        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
	        var lpos = pos;
	        for (;; lpos = pos) {
	            // bits read, code
	            var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
	            pos += c & 15;
	            if (pos > tbts) {
	                if (noSt)
	                    err(0);
	                break;
	            }
	            if (!c)
	                err(2);
	            if (sym < 256)
	                buf[bt++] = sym;
	            else if (sym == 256) {
	                lpos = pos, lm = null;
	                break;
	            }
	            else {
	                var add = sym - 254;
	                // no extra bits needed if less
	                if (sym > 264) {
	                    // index
	                    var i = sym - 257, b = fleb[i];
	                    add = bits(dat, pos, (1 << b) - 1) + fl[i];
	                    pos += b;
	                }
	                // dist
	                var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
	                if (!d)
	                    err(3);
	                pos += d & 15;
	                var dt = fd[dsym];
	                if (dsym > 3) {
	                    var b = fdeb[dsym];
	                    dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
	                }
	                if (pos > tbts) {
	                    if (noSt)
	                        err(0);
	                    break;
	                }
	                if (resize)
	                    cbuf(bt + 131072);
	                var end = bt + add;
	                if (bt < dt) {
	                    var shift = dl - dt, dend = Math.min(dt, end);
	                    if (shift + bt < 0)
	                        err(3);
	                    for (; bt < dend; ++bt)
	                        buf[bt] = dict[shift + bt];
	                }
	                for (; bt < end; ++bt)
	                    buf[bt] = buf[bt - dt];
	            }
	        }
	        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
	        if (lm)
	            final = 1, st.m = lbt, st.d = dm, st.n = dbt;
	    } while (!final);
	    // don't reallocate for streams or user buffers
	    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
	};
	// empty
	var et = /*#__PURE__*/ new u8(0);
	/**
	 * Expands DEFLATE data with no wrapper
	 * @param data The data to decompress
	 * @param opts The decompression options
	 * @returns The decompressed version of the data
	 */
	function inflateSync(data, opts) {
	    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
	}
	// text decoder
	var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
	// text decoder stream
	var tds = 0;
	try {
	    td.decode(et, { stream: true });
	    tds = 1;
	}
	catch (e) { }

	/**
	 *  base64.ts
	 *
	 *  Licensed under the BSD 3-Clause License.
	 *    http://opensource.org/licenses/BSD-3-Clause
	 *
	 *  References:
	 *    http://en.wikipedia.org/wiki/Base64
	 *
	 * @author Dan Kogai (https://github.com/dankogai)
	 */
	const _hasatob = typeof atob === 'function';
	const _hasBuffer = typeof Buffer === 'function';
	typeof TextDecoder === 'function' ? new TextDecoder() : undefined;
	typeof TextEncoder === 'function' ? new TextEncoder() : undefined;
	const b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
	const b64chs = Array.prototype.slice.call(b64ch);
	const b64tab = ((a) => {
	    let tab = {};
	    a.forEach((c, i) => tab[c] = i);
	    return tab;
	})(b64chs);
	const b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
	const _fromCC = String.fromCharCode.bind(String);
	const _U8Afrom = typeof Uint8Array.from === 'function'
	    ? Uint8Array.from.bind(Uint8Array)
	    : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
	const _tidyB64 = (s) => s.replace(/[^A-Za-z0-9\+\/]/g, '');
	/**
	 * polyfill version of `atob`
	 */
	const atobPolyfill = (asc) => {
	    // console.log('polyfilled');
	    asc = asc.replace(/\s+/g, '');
	    if (!b64re.test(asc))
	        throw new TypeError('malformed base64.');
	    asc += '=='.slice(2 - (asc.length & 3));
	    let u24, bin = '', r1, r2;
	    for (let i = 0; i < asc.length;) {
	        u24 = b64tab[asc.charAt(i++)] << 18
	            | b64tab[asc.charAt(i++)] << 12
	            | (r1 = b64tab[asc.charAt(i++)]) << 6
	            | (r2 = b64tab[asc.charAt(i++)]);
	        bin += r1 === 64 ? _fromCC(u24 >> 16 & 255)
	            : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255)
	                : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
	    }
	    return bin;
	};
	/**
	 * does what `window.atob` of web browsers do.
	 * @param {String} asc Base64-encoded string
	 * @returns {string} binary string
	 */
	const _atob = _hasatob ? (asc) => atob(_tidyB64(asc))
	    : _hasBuffer ? (asc) => Buffer.from(asc, 'base64').toString('binary')
	        : atobPolyfill;
	//
	const _toUint8Array = _hasBuffer
	    ? (a) => _U8Afrom(Buffer.from(a, 'base64'))
	    : (a) => _U8Afrom(_atob(a).split('').map(c => c.charCodeAt(0)));
	/**
	 * converts a Base64 string to a Uint8Array.
	 */
	const toUint8Array = (a) => _toUint8Array(_unURI(a));
	const _unURI = (a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == '-' ? '+' : '/'));

	/**
	 * Inflates given data then unpacks with MessagePack. This function is the inverse of `packAndDeflate`.
	 *
	 * @param {Uint8Array}  data - Any data.
	 *
	 * @param {object}   [opts] - Optional parameters.
	 *
	 * @param {import('#runtime/data/compress').InflateOptions} [opts.inflateOptions] - Inflate options.
	 *
	 * @returns {any} Inflated and unpacked data.
	 */
	function inflateAndUnpack(data, { inflateOptions } = {})
	{
	   return unpack(inflateSync(data, inflateOptions));
	}

	/**
	 * Converts Base64 string to Uint8Array / inflates then unpacks with MessagePack. This function is the inverse of
	 * `packAndDeflateB64`.
	 *
	 * @param {string}  data - Any Base64 data that has been compressed with
	 *
	 * @param {object}   [opts] - Optional parameters.
	 *
	 * @param {import('#runtime/data/compress').InflateOptions} [opts.inflateOptions] - Inflate options.
	 *
	 * @returns {any} Inflated and unpacked data.
	 */
	function inflateAndUnpackB64(data, { inflateOptions } = {})
	{
	   return unpack(inflateSync(toUint8Array(data), inflateOptions));
	}

	/** @returns {void} */
	function noop() {}

	const identity = (x) => x;

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/**
	 * Get the current value from a store by subscribing and immediately unsubscribing.
	 *
	 * https://svelte.dev/docs/svelte-store#get
	 * @template T
	 * @param {import('../store/public.js').Readable<T>} store
	 * @returns {T}
	 */
	function get_store_value(store) {
		let value;
		subscribe(store, (_) => (value = _))();
		return value;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	function null_to_empty(value) {
		return value == null ? '' : value;
	}

	function set_store_value(store, ret, value) {
		store.set(value);
		return ret;
	}

	function action_destroyer(action_result) {
		return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
	}

	const is_client = typeof window !== 'undefined';

	/** @type {() => number} */
	let now = is_client ? () => window.performance.now() : () => Date.now();

	let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;

	const tasks = new Set();

	/**
	 * @param {number} now
	 * @returns {void}
	 */
	function run_tasks(now) {
		tasks.forEach((task) => {
			if (!task.c(now)) {
				tasks.delete(task);
				task.f();
			}
		});
		if (tasks.size !== 0) raf(run_tasks);
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {import('./private.js').TaskCallback} callback
	 * @returns {import('./private.js').Task}
	 */
	function loop(callback) {
		/** @type {import('./private.js').TaskEntry} */
		let task;
		if (tasks.size === 0) raf(run_tasks);
		return {
			promise: new Promise((fulfill) => {
				tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {Node} node
	 * @returns {CSSStyleSheet}
	 */
	function append_empty_stylesheet(node) {
		const style_element = element('style');
		// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
		// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
		// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
		// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
		// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
		style_element.textContent = '/* empty */';
		append_stylesheet(get_root_for_style(node), style_element);
		return style_element.sheet;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @template {keyof SVGElementTagNameMap} K
	 * @param {K} name
	 * @returns {SVGElement}
	 */
	function svg_element(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function prevent_default(fn) {
		return function (event) {
			event.preventDefault();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @returns {(event: any) => any} */
	function stop_propagation(fn) {
		return function (event) {
			event.stopPropagation();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	function construct_svelte_component(component, props) {
		return new component(props);
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	// we need to store the information for multiple documents because a Svelte application could also contain iframes
	// https://github.com/sveltejs/svelte/issues/3624
	/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
	const managed_styles = new Map();

	let active = 0;

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	/**
	 * @param {string} str
	 * @returns {number}
	 */
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {Element & ElementCSSInlineStyle} node
	 * @returns {{ stylesheet: any; rules: {}; }}
	 */
	function create_style_information(doc, node) {
		const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
		managed_styles.set(doc, info);
		return info;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {number} a
	 * @param {number} b
	 * @param {number} duration
	 * @param {number} delay
	 * @param {(t: number) => number} ease
	 * @param {(t: number, u: number) => string} fn
	 * @param {number} uid
	 * @returns {string}
	 */
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		const doc = get_root_for_style(node);
		const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
		if (!rules[name]) {
			rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {string} [name]
	 * @returns {void}
	 */
	function delete_rule(node, name) {
		const previous = (node.style.animation || '').split(', ');
		const next = previous.filter(
			name
				? (anim) => anim.indexOf(name) < 0 // remove specific animation
				: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
		);
		const deleted = previous.length - next.length;
		if (deleted) {
			node.style.animation = next.join(', ');
			active -= deleted;
			if (!active) clear_rules();
		}
	}

	/** @returns {void} */
	function clear_rules() {
		raf(() => {
			if (active) return;
			managed_styles.forEach((info) => {
				const { ownerNode } = info.stylesheet;
				// there is no ownerNode if it runs on jsdom.
				if (ownerNode) detach(ownerNode);
			});
			managed_styles.clear();
		});
	}

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Schedules a callback to run immediately before the component is unmounted.
	 *
	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
	 * only one that runs inside a server-side component.
	 *
	 * https://svelte.dev/docs/svelte#ondestroy
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	/**
	 * Associates an arbitrary `context` object with the current component and the specified `key`
	 * and returns that object. The context is then available to children of the component
	 * (including slotted content) with `getContext`.
	 *
	 * Like lifecycle functions, this must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#setcontext
	 * @template T
	 * @param {any} key
	 * @param {T} context
	 * @returns {T}
	 */
	function setContext(key, context) {
		get_current_component().$$.context.set(key, context);
		return context;
	}

	/**
	 * Retrieves the context that belongs to the closest parent component with the specified `key`.
	 * Must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#getcontext
	 * @template T
	 * @param {any} key
	 * @returns {T}
	 */
	function getContext(key) {
		return get_current_component().$$.context.get(key);
	}

	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	/**
	 * @param component
	 * @param event
	 * @returns {void}
	 */
	function bubble(component, event) {
		const callbacks = component.$$.callbacks[event.type];
		if (callbacks) {
			// @ts-ignore
			callbacks.slice().forEach((fn) => fn.call(this, event));
		}
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {Promise<void>} */
	function tick() {
		schedule_update();
		return resolved_promise;
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	/** @returns {void} */
	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	/**
	 * @type {Promise<void> | null}
	 */
	let promise;

	/**
	 * @returns {Promise<void>}
	 */
	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	/**
	 * @param {Element} node
	 * @param {INTRO | OUTRO | boolean} direction
	 * @param {'start' | 'end'} kind
	 * @returns {void}
	 */
	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/**
	 * @type {import('../transition/public.js').TransitionConfig}
	 */
	const null_transition = { duration: 0 };

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @param {boolean} intro
	 * @returns {{ run(b: 0 | 1): void; end(): void; }}
	 */
	function create_bidirectional_transition(node, fn, params, intro) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'both' };
		let config = fn(node, params, options);
		let t = intro ? 0 : 1;

		/**
		 * @type {Program | null} */
		let running_program = null;

		/**
		 * @type {PendingProgram | null} */
		let pending_program = null;
		let animation_name = null;

		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function clear_animation() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @param {PendingProgram} program
		 * @param {number} duration
		 * @returns {Program}
		 */
		function init(program, duration) {
			const d = /** @type {Program['d']} */ (program.b - t);
			duration *= Math.abs(d);
			return {
				a: t,
				b: program.b,
				d,
				duration,
				start: program.start,
				end: program.start + duration,
				group: program.group
			};
		}

		/**
		 * @param {INTRO | OUTRO} b
		 * @returns {void}
		 */
		function go(b) {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;

			/**
			 * @type {PendingProgram} */
			const program = {
				start: now() + delay,
				b
			};

			if (!b) {
				// @ts-ignore todo: improve typings
				program.group = outros;
				outros.r += 1;
			}

			if ('inert' in node) {
				if (b) {
					if (original_inert_value !== undefined) {
						// aborted/reversed outro — restore previous inert value
						node.inert = original_inert_value;
					}
				} else {
					original_inert_value = /** @type {HTMLElement} */ (node).inert;
					node.inert = true;
				}
			}

			if (running_program || pending_program) {
				pending_program = program;
			} else {
				// if this is an intro, and there's a delay, we need to do
				// an initial tick and/or apply CSS animation immediately
				if (css) {
					clear_animation();
					animation_name = create_rule(node, t, b, duration, delay, easing, css);
				}
				if (b) tick(0, 1);
				running_program = init(program, duration);
				add_render_callback(() => dispatch(node, b, 'start'));
				loop((now) => {
					if (pending_program && now > pending_program.start) {
						running_program = init(pending_program, duration);
						pending_program = null;
						dispatch(node, running_program.b, 'start');
						if (css) {
							clear_animation();
							animation_name = create_rule(
								node,
								t,
								running_program.b,
								running_program.duration,
								0,
								easing,
								config.css
							);
						}
					}
					if (running_program) {
						if (now >= running_program.end) {
							tick((t = running_program.b), 1 - t);
							dispatch(node, running_program.b, 'end');
							if (!pending_program) {
								// we're done
								if (running_program.b) {
									// intro — we can tidy up immediately
									clear_animation();
								} else {
									// outro — needs to be coordinated
									if (!--running_program.group.r) run_all(running_program.group.c);
								}
							}
							running_program = null;
						} else if (now >= running_program.start) {
							const p = now - running_program.start;
							t = running_program.a + running_program.d * easing(p / running_program.duration);
							tick(t, 1 - t);
						}
					}
					return !!(running_program || pending_program);
				});
			}
		}
		return {
			run(b) {
				if (is_function(config)) {
					wait().then(() => {
						const opts = { direction: b ? 'in' : 'out' };
						// @ts-ignore
						config = config(opts);
						go(b);
					});
				} else {
					go(b);
				}
			},
			end() {
				clear_animation();
				running_program = pending_program = null;
			}
		};
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	// keyed each functions:

	/** @returns {void} */
	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	/** @returns {void} */
	function outro_and_destroy_block(block, lookup) {
		transition_out(block, 1, 1, () => {
			lookup.delete(block.key);
		});
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {{}} */
	function get_spread_update(levels, updates) {
		const update = {};
		const to_null_out = {};
		const accounted_for = { $$scope: 1 };
		let i = levels.length;
		while (i--) {
			const o = levels[i];
			const n = updates[i];
			if (n) {
				for (const key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}
				for (const key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}
				levels[i] = n;
			} else {
				for (const key in o) {
					accounted_for[key] = 1;
				}
			}
		}
		for (const key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}
		return update;
	}

	function get_spread_object(spread_props) {
		return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
	}

	/** @returns {void} */
	function bind(component, name, callback) {
		const index = component.$$.props[name];
		if (index !== undefined) {
			component.$$.bound[index] = callback;
			callback(component.$$.ctx[index]);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	const subscriber_queue = [];

	/**
	 * Creates a `Readable` store that allows reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#readable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function readable(value, start) {
		return {
			subscribe: writable(value, start).subscribe
		};
	}

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>, set: (value: T) => void, update: (fn: import('./public.js').Updater<T>) => void) => import('./public.js').Unsubscriber | void} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>) => T} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @param {S} stores
	 * @param {Function} fn
	 * @param {T} [initial_value]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function derived(stores, fn, initial_value) {
		const single = !Array.isArray(stores);
		/** @type {Array<import('./public.js').Readable<any>>} */
		const stores_array = single ? [stores] : stores;
		if (!stores_array.every(Boolean)) {
			throw new Error('derived() expects stores as input, got a falsy value');
		}
		const auto = fn.length < 2;
		return readable(initial_value, (set, update) => {
			let started = false;
			const values = [];
			let pending = 0;
			let cleanup = noop;
			const sync = () => {
				if (pending) {
					return;
				}
				cleanup();
				const result = fn(single ? values[0] : values, set, update);
				if (auto) {
					set(result);
				} else {
					cleanup = is_function(result) ? result : noop;
				}
			};
			const unsubscribers = stores_array.map((store, i) =>
				subscribe(
					store,
					(value) => {
						values[i] = value;
						pending &= ~(1 << i);
						if (started) {
							sync();
						}
					},
					() => {
						pending |= 1 << i;
					}
				)
			);
			started = true;
			sync();
			return function stop() {
				run_all(unsubscribers);
				cleanup();
				// We need to set this to false because callbacks can still happen despite having unsubscribed:
				// Callbacks might already be placed in the queue which doesn't know it should no longer
				// invoke this derived store.
				started = false;
			};
		});
	}

	/**
	 * Generates derived, readable, writable helper functions wrapping the given Storage API provided with any additional
	 * customization for data serialization. By default, JSON serialization is used.
	 *
	 * @param {object}   opts - Generator options.
	 *
	 * @param {Storage}  opts.storage - The web storage source.
	 *
	 * @param {(value: any, ...rest: any[]) => string}  [opts.serialize] - Replace with custom serialization;
	 *        default: `JSON.stringify`.
	 *
	 * @param {(value: string, ...rest: any[]) => any}  [opts.deserialize] - Replace with custom deserialization;
	 *        default: `JSON.parse`.
	 *
	 * @returns {StorageStores} A complete set of store helper functions and associated storage API instance and
	 *          serialization strategy.
	 */
	function storeGenerator({ storage, serialize = JSON.stringify, deserialize = JSON.parse }) {
	    function isSimpleDeriver(deriver) {
	        return deriver.length < 2;
	    }
	    function storageReadable(key, value, start) {
	        return {
	            subscribe: storageWritable(key, value, start).subscribe
	        };
	    }
	    function storageWritable(key, value, start) {
	        function wrap_start(ogSet) {
	            return start(function wrap_set(new_value) {
	                if (storage) {
	                    storage.setItem(key, serialize(new_value));
	                }
	                return ogSet(new_value);
	            }, function wrap_update(fn) {
	                set(fn(get_store_value(ogStore)));
	            });
	        }
	        if (storage) {
	            const storageValue = storage.getItem(key);
	            try {
	                if (storageValue) {
	                    value = deserialize(storageValue);
	                }
	            }
	            catch (err) { /**/ }
	            storage.setItem(key, serialize(value));
	        }
	        const ogStore = writable(value, start ? wrap_start : void 0);
	        function set(new_value) {
	            if (storage) {
	                storage.setItem(key, serialize(new_value));
	            }
	            ogStore.set(new_value);
	        }
	        function update(fn) {
	            set(fn(get_store_value(ogStore)));
	        }
	        function subscribe(run, invalidate) {
	            return ogStore.subscribe(run, invalidate);
	        }
	        return { set, update, subscribe };
	    }
	    function storageDerived(key, stores, fn, initial_value) {
	        const single = !Array.isArray(stores);
	        const stores_array = single ? [stores] : stores;
	        if (storage && storage.getItem(key)) {
	            try {
	                initial_value = deserialize(storage.getItem(key));
	            }
	            catch (err) { /**/ }
	        }
	        return storageReadable(key, initial_value, (set, update) => {
	            let inited = false;
	            const values = [];
	            let pending = 0;
	            let cleanup;
	            const sync = () => {
	                if (pending) {
	                    return;
	                }
	                cleanup?.();
	                const input = single ? values[0] : values;
	                if (isSimpleDeriver(fn)) {
	                    set(fn(input));
	                }
	                else {
	                    const result = fn(input, set, update);
	                    if (typeof result === 'function') {
	                        cleanup = result;
	                    }
	                }
	            };
	            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
	                values[i] = value;
	                pending &= ~(1 << i);
	                if (inited) {
	                    sync();
	                }
	            }, () => { pending |= (1 << i); }));
	            inited = true;
	            sync();
	            return function stop() {
	                // Equivalent to run_all from Svelte internals.
	                unsubscribers.forEach((unsubscriber) => unsubscriber());
	                cleanup?.();
	            };
	        });
	    }
	    return {
	        readable: storageReadable,
	        writable: storageWritable,
	        derived: storageDerived,
	        storage,
	        serialize,
	        deserialize
	    };
	}

	/**
	 * Provides all Storage API enabled `localStorage` store helper functions. Data is serialized as JSON.
	 */
	const localStores = storeGenerator({ storage: globalThis?.localStorage });

	/**
	 * Provides all Storage API enabled `sessionStorage` store helper functions. Data is serialized as JSON.
	 */
	const sessionStores = storeGenerator({ storage: globalThis?.sessionStorage });

	/**
	 * Provides the base Storage API store manager. It is recommended to use {@link TJSLocalStorage} &
	 * {@link TJSSessionStorage} for standard browser local and session storage use cases. TJSWebStorage exists
	 * to provide additional customization options for custom Storage API compatible storage instances and custom
	 * serialization configuration.
	 */
	class TJSWebStorage
	{
	   /** @type {import('./').StorageStores} */
	   #storageStores;

	   /**
	    * @type {(Map<string, {
	    *    store: import('svelte/store').Writable,
	    *    deserialize?: (value: string, ...rest: any[]) => any,
	    *    serialize?: (value: any, ...rest: any[]) => string
	    * }>)}
	    */
	   #stores = new Map();

	   /**
	    * @param {import('./').StorageStores} storageStores - Provides a complete set of
	    *        storage API store helper functions and the associated storage API instance and serializations strategy.
	    */
	   constructor(storageStores)
	   {
	      this.#storageStores = storageStores;
	   }

	   /**
	    * Creates a new store for the given key.
	    *
	    * @template T
	    *
	    * @param {string}   key - Key to lookup in stores map.
	    *
	    * @param {T}        [defaultValue] - A default value to set for the store.
	    *
	    * @param {import('./').StorageStores} [storageStores] - Additional store creation options.
	    *
	    * @returns {import('svelte/store').Writable<T>} The new store.
	    */
	   #createStore(key, defaultValue = void 0, storageStores)
	   {
	      try
	      {
	         const value = this.#storageStores.storage.getItem(key);
	         if (value !== null)
	         {
	            const deserialize = storageStores?.deserialize ?? this.#storageStores.deserialize;
	            defaultValue = deserialize(value);
	         }
	      }
	      catch (err) { /**/ }

	      const writable = storageStores?.writable ?? this.#storageStores.writable;

	      return writable(key, defaultValue);
	   }

	   /**
	    * @param {string}   key - Storage key.
	    *
	    * @returns {(value: string, ...rest: any[]) => any} Deserialize function.
	    */
	   #getDeserialize(key)
	   {
	      return this.#stores.get(key)?.deserialize ?? this.#storageStores.deserialize;
	   }

	   /**
	    * @param {string}   key - Storage key.
	    *
	    * @returns {(value: any, ...rest: any[]) => string} Serialize function.
	    */
	   #getSerialize(key)
	   {
	      return this.#stores.get(key)?.serialize ?? this.#storageStores.serialize;
	   }

	   /**
	    * Gets a store from the `stores` Map or creates a new store for the key and a given default value.
	    *
	    * @template T
	    *
	    * @param {string}   key - Key to lookup in stores map.
	    *
	    * @param {T}        [defaultValue] - A default value to set for the store.
	    *
	    * @param {import('./').StorageStores} [storageStores] - Additional store creation options.
	    *
	    * @returns {import('svelte/store').Writable<T>} The store for the given key.
	    */
	   #getStore(key, defaultValue = void 0, storageStores)
	   {
	      const storeEntry = this.#stores.get(key);
	      if (storeEntry) { return storeEntry.store; }

	      const store = this.#createStore(key, defaultValue, storageStores);

	      // Set any key specific storage helper details.
	      this.#stores.set(key, {
	         store,
	         deserialize: storageStores?.deserialize,
	         serialize: storageStores?.serialize
	      });

	      return store;
	   }

	   /**
	    * Get value from the storage API.
	    *
	    * @param {string}   key - Key to lookup in storage API.
	    *
	    * @param {*}        [defaultValue] - A default value to return if key not present in session storage.
	    *
	    * @returns {*} Value from session storage or if not defined any default value provided.
	    */
	   getItem(key, defaultValue)
	   {
	      let value = defaultValue;

	      const storageValue = this.#storageStores.storage.getItem(key);

	      if (storageValue !== null)
	      {
	         try
	         {
	            value = this.#getDeserialize(key)(storageValue);
	         }
	         catch (err)
	         {
	            value = defaultValue;
	         }
	      }
	      else if (defaultValue !== void 0)
	      {
	         try
	         {
	            const newValue = this.#getSerialize(key)(defaultValue);

	            // If there is no existing storage value and defaultValue is defined the storage value needs to be set.
	            this.#storageStores.storage.setItem(key, newValue);
	         }
	         catch (err) { /* */ }
	      }

	      return value;
	   }

	   /**
	    * Returns the backing Svelte store for the given key; potentially sets a default value if the key
	    * is not already set.
	    *
	    * @template T
	    *
	    * @param {string}   key - Key to lookup in storage API.
	    *
	    * @param {T}        [defaultValue] - A default value to return if key not present in session storage.
	    *
	    * @param {import('./').StorageStores} [storageStores] - Additional store creation options.
	    *
	    * @returns {import('svelte/store').Writable<T>} The Svelte store for this key.
	    */
	   getStore(key, defaultValue, storageStores)
	   {
	      return this.#getStore(key, defaultValue, storageStores);
	   }

	   /**
	    * Sets the value for the given key in storage API.
	    *
	    * @param {string}   key - Key to lookup in storage API.
	    *
	    * @param {*}        value - A value to set for this key.
	    */
	   setItem(key, value)
	   {
	      const store = this.#getStore(key);
	      store.set(value);
	   }

	   /**
	    * Convenience method to swap a boolean value stored in storage API.
	    *
	    * @param {string}   key - Key to lookup in storage API.
	    *
	    * @param {boolean}  [defaultValue] - A default value to return if key not present in session storage.
	    *
	    * @returns {boolean} The boolean swap for the given key.
	    */
	   swapItemBoolean(key, defaultValue)
	   {
	      const store = this.#getStore(key, defaultValue);

	      let currentValue = false;

	      try
	      {
	         currentValue = !!this.#getDeserialize(key)(this.#storageStores.storage.getItem(key));
	      }
	      catch (err) { /**/ }

	      const newValue = typeof currentValue === 'boolean' ? !currentValue : false;

	      store.set(newValue);
	      return newValue;
	   }

	   // Iterators ------------------------------------------------------------------------------------------------------

	   /**
	    * @template T
	    *
	    * Returns an iterable for the session storage keys and stores.
	    *
	    * @param {RegExp} [regex] - Optional regular expression to filter by storage keys.
	    *
	    * @returns {IterableIterator<[string, import('svelte/store').Writable<T>]>} Iterable iterator of keys and stores.
	    * @yields {import('svelte/store').Writable<T>}
	    */
	   *entries(regex = void 0)
	   {
	      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

	      if (!this.#stores.size) { return void 0; }

	      if (regex)
	      {
	         for (const key of this.#stores.keys())
	         {
	            if (regex.test(key)) { yield [key, this.getStore(key)]; }
	         }
	      }
	      else
	      {
	         for (const key of this.#stores.keys()) { yield [key, this.getStore(key)]; }
	      }
	   }

	   /**
	    * Returns an iterable for the session storage keys from existing stores.
	    *
	    * @param {RegExp} [regex] - Optional regular expression to filter by storage keys.
	    *
	    * @returns {IterableIterator<string>} Iterable iterator of session storage keys.
	    * @yields {string}
	    */
	   *keys(regex = void 0)
	   {
	      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

	      if (!this.#stores.size) { return void 0; }

	      if (regex)
	      {
	         for (const key of this.#stores.keys())
	         {
	            if (regex.test(key)) { yield key; }
	         }
	      }
	      else
	      {
	         for (const key of this.#stores.keys()) { yield key; }
	      }
	   }

	   /**
	    * @template T
	    *
	    * Returns an iterable for the session storage stores.
	    *
	    * @param {RegExp} [regex] - Optional regular expression to filter by storage keys.
	    *
	    * @returns {IterableIterator<import('svelte/store').Writable<T>>} Iterable iterator of stores.
	    * @yields {import('svelte/store').Writable<T>}
	    */
	   *stores(regex = void 0)
	   {
	      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

	      if (!this.#stores.size) { return void 0; }

	      if (regex)
	      {
	         for (const key of this.#stores.keys())
	         {
	            if (regex.test(key)) { yield this.getStore(key); }
	         }
	      }
	      else
	      {
	         for (const key of this.#stores.keys()) { yield this.getStore(key); }
	      }
	   }
	}

	/**
	 * Provides a {@link TJSWebStorage} instance for standard browser local storage use cases.
	 */
	class TJSLocalStorage extends TJSWebStorage
	{
	   constructor()
	   {
	      super(localStores);
	   }
	}

	/**
	 * Provides a {@link TJSWebStorage} instance for standard browser session storage use cases.
	 */
	class TJSSessionStorage extends TJSWebStorage
	{
	   constructor()
	   {
	      super(sessionStores);
	   }
	}

	/**
	 * Tests for whether an object is iterable.
	 *
	 * @param {unknown} value - Any value.
	 *
	 * @returns {boolean} Whether object is iterable.
	 */
	function isIterable(value) {
	    if (value === null || value === void 0 || typeof value !== 'object') {
	        return false;
	    }
	    return Symbol.iterator in value;
	}
	/**
	 * Tests for whether object is not null, typeof object, and not an array.
	 *
	 * @param {unknown} value - Any value.
	 *
	 * @returns {boolean} Is it an object.
	 */
	function isObject(value) {
	    return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	/**
	 * Provides several helpful utility methods for accessibility and keyboard navigation.
	 *
	 * Note: Global debugging can be enabled by setting `A11yHelper.debug = true`.
	 */
	class A11yHelper
	{
	   /**
	    * Provides the event constructor names to duck type against. This is necessary for when HTML nodes / elements are
	    * moved to another browser window as `instanceof` checks will fail.
	    *
	    * @type {Set<string>}
	    */
	   static #eventTypesAll = new Set(['KeyboardEvent', 'MouseEvent', 'PointerEvent']);
	   static #eventTypesPointer = new Set(['MouseEvent', 'PointerEvent']);

	   /**
	    * You can set global focus debugging enabled by setting `A11yHelper.debug = true`.
	    *
	    * @type {boolean}
	    */
	   static #globalDebug = false;

	   /**
	    * @returns {boolean} Global debugging enabled.
	    */
	   static get debug() { return this.#globalDebug; }

	   /**
	    * @param {boolean}  debug - Global debug enabled
	    */
	   static set debug(debug)
	   {
	      if (typeof debug !== 'boolean') { throw new TypeError(`'debug' is not a boolean.`); }

	      this.#globalDebug = debug;
	   }

	   /**
	    * Runs a media query to determine if the user / OS configuration is set up for reduced motion / animation.
	    *
	    * @returns {boolean} User prefers reduced motion.
	    */
	   static get prefersReducedMotion()
	   {
	      return globalThis?.matchMedia('(prefers-reduced-motion: reduce)')?.matches ?? false;
	   }

	   /**
	    * Apply focus to the HTMLElement / SVGElement targets in a given A11yFocusSource data object. An iterable list
	    * `options.focusEl` can contain HTMLElement / SVGElements or selector strings. If multiple focus targets are
	    * provided in a list then the first valid target found will be focused. If focus target is a string then a lookup
	    * via `document.querySelector` is performed. In this case you should provide a unique selector for the desired
	    * focus target.
	    *
	    * Note: The body of this method is postponed to the next clock tick to allow any changes in the DOM to occur that
	    * might alter focus targets before applying.
	    *
	    * @param {A11yFocusSource | { focusSource: A11yFocusSource }}   options - The focus options instance to apply.
	    */
	   static applyFocusSource(options)
	   {
	      if (!isObject(options)) { return; }

	      // Handle the case of receiving an object with embedded `focusSource`.
	      const focusOpts = isObject(options?.focusSource) ? options.focusSource : options;

	      setTimeout(() =>
	      {
	         const debug = typeof focusOpts.debug === 'boolean' ? this.debug || focusOpts.debug : this.debug;

	         if (isIterable(focusOpts.focusEl))
	         {
	            if (debug)
	            {
	               console.debug(`A11yHelper.applyFocusSource debug - Attempting to apply focus target: `,
	                focusOpts.focusEl);
	            }

	            for (const target of focusOpts.focusEl)
	            {
	               if (target?.nodeType === Node.ELEMENT_NODE && target?.isConnected)
	               {
	                  target?.focus();
	                  if (debug)
	                  {
	                     console.debug(`A11yHelper.applyFocusSource debug - Applied focus to target: `, target);
	                  }
	                  break;
	               }
	               else if (typeof target === 'string')
	               {
	                  const element = document.querySelector(target);
	                  if (element?.nodeType === Node.ELEMENT_NODE && element?.isConnected)
	                  {
	                     element?.focus();
	                     if (debug)
	                     {
	                        console.debug(`A11yHelper.applyFocusSource debug - Applied focus to target: `, element);
	                     }
	                     break;
	                  }
	                  else if (debug)
	                  {
	                     console.debug(`A11yHelper.applyFocusSource debug - Could not query selector: `, target);
	                  }
	               }
	            }
	         }
	         else if (debug)
	         {
	            console.debug(`A11yHelper.applyFocusSource debug - No focus targets defined.`);
	         }
	      }, 0);
	   }

	   /**
	    * Returns first focusable element within a specified element.
	    *
	    * @param {Element | Document} [element=document] - Optional element to start query.
	    *
	    * @param {object}            [options] - Optional parameters.
	    *
	    * @param {Iterable<string>}  [options.ignoreClasses] - Iterable list of classes to ignore elements.
	    *
	    * @param {Set<Element>}      [options.ignoreElements] - Set of elements to ignore.
	    *
	    * @returns {FocusableElement} First focusable child element.
	    */
	   static getFirstFocusableElement(element = document, options)
	   {
	      const focusableElements = this.getFocusableElements(element, options);

	      return focusableElements.length > 0 ? focusableElements[0] : void 0;
	   }

	   /**
	    * Returns all focusable elements within a specified element.
	    *
	    * @param {Element | Document} [element=document] Optional element to start query.
	    *
	    * @param {object}            [options] - Optional parameters.
	    *
	    * @param {boolean}           [options.anchorHref=true] - When true anchors must have an HREF.
	    *
	    * @param {Iterable<string>}  [options.ignoreClasses] - Iterable list of classes to ignore elements.
	    *
	    * @param {Set<Element>}      [options.ignoreElements] - Set of elements to ignore.
	    *
	    * @param {string}            [options.selectors] - Custom list of focusable selectors for `querySelectorAll`.
	    *
	    * @returns {Array<FocusableElement>} Child keyboard focusable elements.
	    */
	   static getFocusableElements(element = document, { anchorHref = true, ignoreClasses, ignoreElements, selectors } = {})
	   {
	      if (element?.nodeType !== Node.ELEMENT_NODE && element?.nodeType !== Node.DOCUMENT_NODE)
	      {
	         throw new TypeError(`'element' is not a HTMLElement, SVGElement, or Document instance.`);
	      }

	      if (typeof anchorHref !== 'boolean')
	      {
	         throw new TypeError(`'anchorHref' is not a boolean.`);
	      }

	      if (ignoreClasses !== void 0 && !isIterable(ignoreClasses))
	      {
	         throw new TypeError(`'ignoreClasses' is not an iterable list.`);
	      }

	      if (ignoreElements !== void 0 && !(ignoreElements instanceof Set))
	      {
	         throw new TypeError(`'ignoreElements' is not a Set.`);
	      }

	      if (selectors !== void 0 && typeof selectors !== 'string')
	      {
	         throw new TypeError(`'selectors' is not a string.`);
	      }

	      const selectorQuery = selectors ?? this.#getFocusableSelectors(anchorHref);

	      const allElements = [...element.querySelectorAll(selectorQuery)];

	      if (ignoreElements && ignoreClasses)
	      {
	         return allElements.filter((el) =>
	         {
	            let hasIgnoreClass = false;
	            for (const ignoreClass of ignoreClasses)
	            {
	               if (el.classList.contains(ignoreClass))
	               {
	                  hasIgnoreClass = true;
	                  break;
	               }
	            }

	            return !hasIgnoreClass && !ignoreElements.has(el) && el.style.display !== 'none' &&
	             el.style.visibility !== 'hidden' && !el.hasAttribute('disabled') && !el.hasAttribute('inert') &&
	              el.getAttribute('aria-hidden') !== 'true';
	         });
	      }
	      else if (ignoreClasses)
	      {
	         return allElements.filter((el) =>
	         {
	            let hasIgnoreClass = false;
	            for (const ignoreClass of ignoreClasses)
	            {
	               if (el.classList.contains(ignoreClass))
	               {
	                  hasIgnoreClass = true;
	                  break;
	               }
	            }

	            return !hasIgnoreClass && el.style.display !== 'none' && el.style.visibility !== 'hidden' &&
	             !el.hasAttribute('disabled') && !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true';
	         });
	      }
	      else if (ignoreElements)
	      {
	         return allElements.filter((el) =>
	         {
	            return !ignoreElements.has(el) && el.style.display !== 'none' && el.style.visibility !== 'hidden' &&
	             !el.hasAttribute('disabled') && !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true';
	         });
	      }
	      else
	      {
	         return allElements.filter((el) =>
	         {
	            return el.style.display !== 'none' && el.style.visibility !== 'hidden' && !el.hasAttribute('disabled') &&
	             !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true';
	         });
	      }
	   }

	   /**
	    * Returns the default focusable selectors query.
	    *
	    * @param {boolean}  [anchorHref=true] - When true anchors must have an HREF.
	    *
	    * @returns {string} Focusable selectors for `querySelectorAll`.
	    */
	   static #getFocusableSelectors(anchorHref = true)
	   {
	      return `button, [contenteditable=""], [contenteditable="true"], details summary:not([tabindex="-1"]), embed, a${
       anchorHref ? '[href]' : ''}, iframe, object, input:not([type=hidden]), select, textarea, ` +
	        `[tabindex]:not([tabindex="-1"])`;
	   }

	   /**
	    * Gets a A11yFocusSource object from the given DOM event allowing for optional X / Y screen space overrides.
	    * Browsers (Firefox / Chrome) forwards a mouse event for the context menu keyboard button. Provides detection of
	    * when the context menu event is from the keyboard. Firefox as of (1/23) does not provide the correct screen space
	    * coordinates, so for keyboard context menu presses coordinates are generated from the centroid point of the
	    * element.
	    *
	    * A default fallback element or selector string may be provided to provide the focus target. If the event comes from
	    * the keyboard however the source focused element is inserted as the target with the fallback value appended to the
	    * list of focus targets. When A11yFocusSource is applied by {@link A11yHelper.applyFocusSource} the target focus
	    * list is iterated through until a connected target is found and focus applied.
	    *
	    * @param {object} options - Options
	    *
	    * @param {KeyboardEvent | MouseEvent}   [options.event] - The source DOM event.
	    *
	    * @param {boolean} [options.debug] - When true {@link A11yHelper.applyFocusSource} logs focus target data.
	    *
	    * @param {FocusableElement | string} [options.focusEl] - A specific HTMLElement / SVGElement or selector
	    *        string as the focus target.
	    *
	    * @param {number}   [options.x] - Used when an event isn't provided; integer of event source in screen space.
	    *
	    * @param {number}   [options.y] - Used when an event isn't provided; integer of event source in screen space.
	    *
	    * @returns {A11yFocusSource} A A11yFocusSource object.
	    *
	    * @see https://bugzilla.mozilla.org/show_bug.cgi?id=1426671
	    * @see https://bugzilla.mozilla.org/show_bug.cgi?id=314314
	    *
	    * TODO: Evaluate / test against touch input devices.
	    */
	   static getFocusSource({ event, x, y, focusEl, debug = false })
	   {
	      if (focusEl !== void 0 && !this.isFocusSource(focusEl))
	      {
	         throw new TypeError(
	          `A11yHelper.getFocusSource error: 'focusEl' is not a HTMLElement, SVGElement, or string.`);
	      }

	      if (debug !== void 0 && typeof debug !== 'boolean')
	      {
	         throw new TypeError(`A11yHelper.getFocusSource error: 'debug' is not a boolean.`);
	      }

	      const debugEnabled = typeof debug === 'boolean' ? this.debug || debug : this.debug;

	      // Handle the case when no event is provided and x, y, or focusEl is explicitly defined.
	      if (event === void 0)
	      {
	         if (typeof x !== 'number')
	         {
	            throw new TypeError(`A11yHelper.getFocusSource error: 'event' not defined and 'x' is not a number.`);
	         }

	         if (typeof y !== 'number')
	         {
	            throw new TypeError(`A11yHelper.getFocusSource error: 'event' not defined and 'y' is not a number.`);
	         }

	         const result = {
	            debug,
	            focusEl: focusEl !== void 0 ? [focusEl] : void 0,
	            x,
	            y,
	         };

	         if (debugEnabled)
	         {
	            console.debug(`A11yHelper.getFocusSource debug: generated 'focusSource' without event: `, result);
	         }

	         return result;
	      }

	      // Perform duck typing on event constructor name.
	      if (!A11yHelper.#eventTypesAll.has(event?.constructor?.name))
	      {
	         throw new TypeError(
	          `A11yHelper.getFocusSource error: 'event' is not a KeyboardEvent, MouseEvent, or PointerEvent.`);
	      }

	      if (x !== void 0 && !Number.isInteger(x))
	      {
	         throw new TypeError(`A11yHelper.getFocusSource error: 'x' is not a number.`);
	      }

	      if (y !== void 0 && !Number.isInteger(y))
	      {
	         throw new TypeError(`A11yHelper.getFocusSource error: 'y' is not a number.`);
	      }

	      /** @type {Element} */
	      let targetEl;

	      if (event)
	      {
	         if (A11yHelper.isFocusable(event.target))
	         {
	            targetEl = event.target;
	            if (debugEnabled)
	            {
	               console.debug(`A11yHelper.getFocusSource debug: 'targetEl' set to event.target: `, targetEl);
	            }
	         }
	         else if (A11yHelper.isFocusable(event.currentTarget))
	         {
	            targetEl = event.currentTarget;
	            if (debugEnabled)
	            {
	               console.debug(`A11yHelper.getFocusSource debug: 'targetEl' set to event.currentTarget: `, targetEl);
	            }
	         }
	         else
	         {
	            if (debugEnabled)
	            {
	               console.debug(
	                `A11yHelper.getFocusSource debug: 'event.target' / 'event.currentTarget' are not focusable.`);
	               console.debug(`A11yHelper.getFocusSource debug: 'event.target': `, event.target);
	               console.debug(`A11yHelper.getFocusSource debug: 'event.currentTarget': `, event.currentTarget);
	            }
	         }

	         if (targetEl)
	         {
	            if (targetEl?.nodeType !== Node.ELEMENT_NODE && typeof targetEl?.focus !== 'function')
	            {
	               throw new TypeError(`A11yHelper.getFocusSource error: 'targetEl' is not an HTMLElement or SVGElement.`);
	            }
	         }
	      }

	      const result = { debug };

	      // Perform duck typing on event constructor name.
	      if (A11yHelper.#eventTypesPointer.has(event?.constructor?.name))
	      {
	         // Firefox currently (1/23) does not correctly determine the location of a keyboard originated
	         // context menu location, so calculate position from middle of the event target.
	         // Firefox fires a mouse event for the context menu key.
	         if (event?.button !== 2 && event.type === 'contextmenu')
	         {
	            // Always include x / y coordinates and targetEl may not be defined.
	            const rectTarget = targetEl ?? event.target;

	            const rect = rectTarget.getBoundingClientRect();
	            result.source = 'keyboard';
	            result.x = x ?? rect.left + (rect.width / 2);
	            result.y = y ?? rect.top + (rect.height / 2);
	            result.focusEl = targetEl ? [targetEl] : [];

	            if (focusEl) { result.focusEl.push(focusEl); }
	         }
	         else
	         {
	            result.source = 'pointer';
	            result.x = x ?? event.pageX;
	            result.y = y ?? event.pageY;
	            result.focusEl = targetEl ? [targetEl] : [];

	            if (focusEl) { result.focusEl.push(focusEl); }
	         }
	      }
	      else
	      {
	         // Always include x / y coordinates and targetEl may not be defined.
	         const rectTarget = targetEl ?? event.target;

	         const rect = rectTarget.getBoundingClientRect();
	         result.source = 'keyboard';
	         result.x = x ?? rect.left + (rect.width / 2);
	         result.y = y ?? rect.top + (rect.height / 2);
	         result.focusEl = targetEl ? [targetEl] : [];

	         if (focusEl) { result.focusEl.push(focusEl); }
	      }

	      if (debugEnabled)
	      {
	         console.debug(`A11yHelper.getFocusSource debug: generated 'focusSource' with event: `, result);
	      }

	      return result;
	   }

	   /**
	    * Returns first focusable element within a specified element.
	    *
	    * @param {Element | Document} [element=document] - Optional element to start query.
	    *
	    * @param {object} [options] - Optional parameters.
	    *
	    * @param {Iterable<string>} [options.ignoreClasses] - Iterable list of classes to ignore elements.
	    *
	    * @param {Set<Element>} [options.ignoreElements] - Set of elements to ignore.
	    *
	    * @returns {FocusableElement} Last focusable child element.
	    */
	   static getLastFocusableElement(element = document, options)
	   {
	      const focusableElements = this.getFocusableElements(element, options);

	      return focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : void 0;
	   }

	   /**
	    * Tests if the given element is focusable.
	    *
	    * @param {Element} el - Element to test.
	    *
	    * @param {object} [options] - Optional parameters.
	    *
	    * @param {boolean} [options.anchorHref=true] - When true anchors must have an HREF.
	    *
	    * @param {Iterable<string>} [options.ignoreClasses] - Iterable list of classes to ignore elements.
	    *
	    * @returns {boolean} Element is focusable.
	    */
	   static isFocusable(el, { anchorHref = true, ignoreClasses } = {})
	   {
	      if (el === void 0 || el === null || el?.hidden || !el?.isConnected || el?.nodeType !== Node.ELEMENT_NODE ||
	       typeof el?.focus !== 'function')
	      {
	         return false;
	      }

	      if (typeof anchorHref !== 'boolean')
	      {
	         throw new TypeError(`'anchorHref' is not a boolean.`);
	      }

	      if (ignoreClasses !== void 0 && !isIterable(ignoreClasses))
	      {
	         throw new TypeError(`'ignoreClasses' is not an iterable list.`);
	      }

	      const contenteditableAttr = el.getAttribute('contenteditable');
	      const contenteditableFocusable = typeof contenteditableAttr === 'string' &&
	       (contenteditableAttr === '' || contenteditableAttr === 'true');

	      const tabindexAttr = globalThis.parseInt(el.getAttribute('tabindex'));
	      const tabindexFocusable = Number.isInteger(tabindexAttr) && tabindexAttr >= 0;

	      const isAnchor = el instanceof HTMLAnchorElement;

	      if (contenteditableFocusable || tabindexFocusable || isAnchor || el instanceof HTMLButtonElement ||
	       el instanceof HTMLDetailsElement || el instanceof HTMLEmbedElement || el instanceof HTMLIFrameElement ||
	        el instanceof HTMLInputElement || el instanceof HTMLObjectElement || el instanceof HTMLSelectElement ||
	         el instanceof HTMLTextAreaElement)
	      {
	         if (isAnchor && !tabindexFocusable && anchorHref && typeof el.getAttribute('href') !== 'string')
	         {
	            return false;
	         }

	         return el.style.display !== 'none' && el.style.visibility !== 'hidden' && !el.hasAttribute('disabled') &&
	          !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true';
	      }

	      return false;
	   }

	   /**
	    * Convenience method to check if the given data is a valid focus source.
	    *
	    * @param {Element | string}   data - Either an HTMLElement, SVGElement, or selector string.
	    *
	    * @returns {boolean} Is valid focus source.
	    */
	   static isFocusSource(data)
	   {
	      return typeof data === 'string' || (data?.nodeType === Node.ELEMENT_NODE && typeof data?.focus === 'function');
	   }

	   /**
	    * Tests if the given `element` is a Element node and has a `focus` method.
	    *
	    * @param {Element}  element - Element to test for focus method.
	    *
	    * @returns {boolean} Whether the element has a focus method.
	    */
	   static isFocusTarget(element)
	   {
	      return element !== void 0 && element !== null && element?.nodeType === Node.ELEMENT_NODE &&
	       typeof element?.focus === 'function';
	   }

	   /**
	    * Perform a parent traversal from the current active element attempting to match the given element to test whether
	    * current active element is within that element.
	    *
	    * @param {Element}  element - An element to match in parent traversal from the active element.
	    *
	    * @param {Window}   [activeWindow=globalThis] The active window to use for the current active element.
	    *
	    * @returns {boolean} Whether there is focus within the given element.
	    */
	   static isFocusWithin(element, activeWindow = globalThis)
	   {
	      if (element === void 0 || element === null || element?.hidden || !element?.isConnected) { return false; }

	      if (Object.prototype.toString.call(activeWindow) !== '[object Window]') { return false; }

	      let active = activeWindow.document.activeElement;

	      while (active)
	      {
	         if (active === element) { return true; }

	         active = active.parentElement;
	      }

	      return false;
	   }
	}

	/**
	 * Awaits `requestAnimationFrame` calls by the counter specified. This allows asynchronous applications for direct /
	 * inline style modification amongst other direct animation techniques.
	 *
	 * @param {number}   [cntr=1] - A positive integer greater than 0 for amount of requestAnimationFrames to wait.
	 *
	 * @returns {Promise<number>} Returns current time equivalent to `performance.now()`.
	 */
	async function nextAnimationFrame(cntr = 1)
	{
	   if (!Number.isInteger(cntr) || cntr < 1)
	   {
	      throw new TypeError(`nextAnimationFrame error: 'cntr' must be a positive integer greater than 0.`);
	   }

	   let currentTime = performance.now();
	   for (;--cntr >= 0;)
	   {
	      currentTime = await new Promise((resolve) => requestAnimationFrame(resolve));
	   }

	   return currentTime;
	}

	/**
	 * Provides the following global keyboard commands:
	 * - <Alt-C>: Focus main content
	 * - <Alt-E>: Expand / collapse all navigation folders.
	 * - <Alt-H>: Open / close the help panel.
	 * - <Alt-I>: Go to home page / main index.html
	 * - <Alt-M>: If there is a `modules.html` index then go to it.
	 * - <Alt-N>: Scroll to current page in navigation panel and focus it.
	 * - <Alt-O>: If available, focus first anchor in `On This Page` container.
	 *
	 * @param {DMTComponentData} dmtComponentData - NavigationData instance.
	 */
	function keyCommands(dmtComponentData)
	{
	   const { hasModulesIndex, navigationData } = dmtComponentData;

	   // Direct focus target.
	   globalThis.document.addEventListener('keydown', (event) =>
	   {
	      if (!event.altKey || event.repeat) { return; }

	      switch (event.code)
	      {
	         case 'KeyC':
	            const mainContentEl = document.querySelector('.col-content');
	            if (mainContentEl)
	            {
	               const focusableEl = A11yHelper.getFirstFocusableElement(mainContentEl);
	               if (focusableEl) { focusableEl.focus({ focusVisible: true }); }
	            }
	            event.preventDefault();
	            break;

	         case 'KeyE':
	            navigationData.setStoresAllOpen(!get_store_value(navigationData.storeSessionAllOpen));
	            event.preventDefault();
	            break;

	         case 'KeyH':
	            navigationData.storeHelpPanelOpen.set(!get_store_value(navigationData.storeHelpPanelOpen));
	            event.preventDefault();
	            break;

	         case 'KeyI':
	            window.location.href = `${navigationData.baseURL}index.html`;
	            event.preventDefault();
	            break;

	         case 'KeyM':
	            if (hasModulesIndex)
	            {
	               window.location.href = `${navigationData.baseURL}modules.html`;
	            }
	            event.preventDefault();
	            break;

	         case 'KeyN':
	         {
	            // Ensure current path is open and focus current path navigation entry.
	            const currentPathURL = navigationData.currentPathURL;
	            navigationData.state.ensureCurrentPath(navigationData.currentPathURL);

	            // Wait for the next animation frame as this will ensure multiple levels of tree nodes opening.
	            nextAnimationFrame().then(() => document.querySelector('nav.tsd-navigation')?.querySelector(
	             `a[href*="${currentPathURL}"]`)?.focus({ focusVisible: true }));
	            event.preventDefault();
	            break;
	         }

	         case 'KeyO':
	         {
	            /** @type {HTMLDetailsElement} */
	            const detailsEl = globalThis.document.querySelector('details.tsd-page-navigation');
	            if (detailsEl)
	            {
	               const anchorEl = detailsEl.querySelector('a');
	               if (anchorEl)
	               {
	                  detailsEl.open = true;
	                  setTimeout(() => anchorEl.focus({ focusVisible: true }), 0);
	               }
	            }
	            event.preventDefault();
	            break;
	         }
	      }
	   });
	}

	/**
	 * This function registers pointer event listeners to programmatically focus the scrolling element beneath the input
	 * device. This allows keyboard control of the appropriate scrolling container. However, due to this theme being an
	 * augmentation of the default theme there are some layout aspects we can't control. There isn't a clean separation
	 * between the left side navigation, main container, and new `On This Page` content scrolling element. In particular
	 * when entering the `.col-content` element the main `.container-main` element is focused. Due to the left hand
	 * navigation and `On This Page` element being children of the .container-main` element when programmatically focusing
	 * a reflow will be triggered. This can't be solved without a rework of the HTML layout. Since this theme is an
	 * augmentation of the default theme there is only so much that can be done.
	 *
	 * The target scrolling elements are set to have a `tabindex` of `-1` in {@link PageRenderer.#augmentGlobal}. There are
	 * styles in `dmt-theme.scss` to set the outline of the scroll containers to transparent for `:focus-visible`.
	 *
	 * While it's nice to have a layout that doesn't reflow so often in practice this is not a performance issue despite the
	 * warnings that will post in the developer console. This can be fixed with a more hands on rework of the layout which
	 * is beyond the scope of this theme currently. In other words don't freak out if you see what looks like reflow /
	 * layout thrashing. It is due to the code below / manual programmatic focusing which serves a purpose and makes for a
	 * really nice fluid keyboard control. It also allows intuitive start of explicit focus traversal.
	 */
	function scrollActivation()
	{
	   // Direct focus target.
	   const navContainerEl = globalThis.document.querySelector('div.dmt-navigation-content');

	   // Direct focus target / will be null when not on page.
	   const onThisPageInnerEl = globalThis.document.querySelector('details.tsd-page-navigation .tsd-accordion-details');
	   // Ambient focus target for colContentEl.
	   const mainContainerEl = globalThis.document.querySelector('div.container.container-main');

	   // Focus targets that activate mainContainerEl.
	   const colContentEl = globalThis.document.querySelector('div.col-content');

	   /**
	    * Allow a focus change to occur if any explicitly focused element is one of the following.`null` handles the case
	    * when there is no current explicitly focused element / result from `querySelector(':focus-visible')`.
	    *
	    * @type {Set<Element|null>}
	    */
	   const focusContainers = new Set([mainContainerEl, navContainerEl, onThisPageInnerEl, null]);

	   // Direct focus targets -------------------------------------------------------------------------------------------

	   if (navContainerEl)
	   {
	      navContainerEl.addEventListener('pointerenter', (event) =>
	      {
	         event.preventDefault();
	         event.stopImmediatePropagation();

	         const explicitlyFocusedEl = globalThis.document.querySelector(':focus-visible');

	         // Abort if the explicitly focused element is not on of the target elements tracked.
	         if (globalThis.document.activeElement !== navContainerEl && focusContainers.has(explicitlyFocusedEl))
	         {
	            globalThis.requestAnimationFrame(() => navContainerEl.focus({ preventScroll: true }));
	         }
	      });
	   }

	   // Will be null when not on page.
	   if (onThisPageInnerEl)
	   {
	      onThisPageInnerEl.addEventListener('pointerenter', (event) =>
	      {
	         event.preventDefault();
	         event.stopImmediatePropagation();

	         const explicitlyFocusedEl = globalThis.document.querySelector(':focus-visible');

	         // Abort if the explicitly focused element is not on of the target elements tracked.
	         if (globalThis.document.activeElement !== onThisPageInnerEl && focusContainers.has(explicitlyFocusedEl))
	         {
	            globalThis.requestAnimationFrame(() => onThisPageInnerEl.focus({ preventScroll: true }));
	         }
	      });
	   }

	   // Indirect focus targets / activates mainContainerEl ---------------------------------------------------------------

	   if (colContentEl)
	   {
	      colContentEl.addEventListener('pointerenter', (event) =>
	      {
	         event.preventDefault();
	         event.stopImmediatePropagation();

	         const explicitlyFocusedEl = globalThis.document.querySelector(':focus-visible');

	         if (globalThis.document.activeElement !== mainContainerEl && focusContainers.has(explicitlyFocusedEl))
	         {
	            globalThis.requestAnimationFrame(() => mainContainerEl.focus({ preventScroll: true }));
	         }
	      });
	   }
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	/* src\components\navigation\Entry.svelte generated by Svelte v4.2.8 */

	function create_else_block$3(ctx) {
		let span;
		let t_value = /*entry*/ ctx[0].text + "";
		let t;

		return {
			c() {
				span = element("span");
				t = text(t_value);
				attr(span, "class", "svelte-8p5j4n");
				toggle_class(span, "indent-icon", /*indentIcon*/ ctx[1] === 'indent-icon');
				toggle_class(span, "indent-no-icon", /*indentIcon*/ ctx[1] === 'indent-no-icon');
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, t);
			},
			p(ctx, dirty) {
				if (dirty & /*entry*/ 1 && t_value !== (t_value = /*entry*/ ctx[0].text + "")) set_data(t, t_value);

				if (dirty & /*indentIcon*/ 2) {
					toggle_class(span, "indent-icon", /*indentIcon*/ ctx[1] === 'indent-icon');
				}

				if (dirty & /*indentIcon*/ 2) {
					toggle_class(span, "indent-no-icon", /*indentIcon*/ ctx[1] === 'indent-no-icon');
				}
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (44:0) {#if path}
	function create_if_block$9(ctx) {
		let a;
		let t0;
		let span;
		let t1_value = /*entry*/ ctx[0].text + "";
		let t1;
		let mounted;
		let dispose;
		let if_block = /*icon*/ ctx[6] && create_if_block_1$3(ctx);

		return {
			c() {
				a = element("a");
				if (if_block) if_block.c();
				t0 = space();
				span = element("span");
				t1 = text(t1_value);
				attr(span, "class", "svelte-8p5j4n");
				attr(a, "href", /*path*/ ctx[7]);
				attr(a, "data-storage-key", /*storageKey*/ ctx[2]);
				attr(a, "class", "svelte-8p5j4n");
				toggle_class(a, "current", /*isCurrent*/ ctx[3]);
				toggle_class(a, "indent-icon", /*indentIcon*/ ctx[1] === 'indent-icon');
				toggle_class(a, "indent-no-icon", /*indentIcon*/ ctx[1] === 'indent-no-icon');
			},
			m(target, anchor) {
				insert(target, a, anchor);
				if (if_block) if_block.m(a, null);
				append(a, t0);
				append(a, span);
				append(span, t1);

				if (!mounted) {
					dispose = listen(a, "click", stop_propagation(prevent_default(/*onClick*/ ctx[8])));
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (/*icon*/ ctx[6]) if_block.p(ctx, dirty);
				if (dirty & /*entry*/ 1 && t1_value !== (t1_value = /*entry*/ ctx[0].text + "")) set_data(t1, t1_value);

				if (dirty & /*storageKey*/ 4) {
					attr(a, "data-storage-key", /*storageKey*/ ctx[2]);
				}

				if (dirty & /*isCurrent*/ 8) {
					toggle_class(a, "current", /*isCurrent*/ ctx[3]);
				}

				if (dirty & /*indentIcon*/ 2) {
					toggle_class(a, "indent-icon", /*indentIcon*/ ctx[1] === 'indent-icon');
				}

				if (dirty & /*indentIcon*/ 2) {
					toggle_class(a, "indent-no-icon", /*indentIcon*/ ctx[1] === 'indent-no-icon');
				}
			},
			d(detaching) {
				if (detaching) {
					detach(a);
				}

				if (if_block) if_block.d();
				mounted = false;
				dispose();
			}
		};
	}

	// (51:6) {#if icon}
	function create_if_block_1$3(ctx) {
		let svg;
		let use;

		return {
			c() {
				svg = svg_element("svg");
				use = svg_element("use");
				attr(use, "href", `${/*iconsPrepend*/ ctx[4]}#icon-${/*icon*/ ctx[6]}`);
				attr(svg, "class", "tsd-kind-icon svelte-8p5j4n");
				attr(svg, "viewBox", "0 0 24 24");
			},
			m(target, anchor) {
				insert(target, svg, anchor);
				append(svg, use);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(svg);
				}
			}
		};
	}

	function create_fragment$e(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*path*/ ctx[7]) return create_if_block$9;
			return create_else_block$3;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if_block.p(ctx, dirty);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	function instance$e($$self, $$props, $$invalidate) {
		let isCurrent;
		let $storeCurrentPathURL;
		let { entry } = $$props;
		let { removeIcon = false } = $$props;
		let { indentIcon = void 0 } = $$props;
		let { storageKey = null } = $$props;

		/** @type {string} */
		const iconsPrepend = getContext('#iconsPrepend');

		const { basePath, storeCurrentPathURL } = /** @type {NavigationData} */
		getContext('#navigationData');

		component_subscribe($$self, storeCurrentPathURL, value => $$invalidate(10, $storeCurrentPathURL = value));
		const icon = !removeIcon && entry.kind ? entry.kind : void 0;
		const path = entry.path ? `${basePath}${entry.path}` : void 0;

		/**
	 * Disables default browser downloading when `Alt-Click` is pressed. This helps to protect users as `Alt-Click` on
	 * Folder components closes all children folders and this protects an easy mistake when clicking on an anchor.
	 */
		function onClick() {
			globalThis.location.href = path;
		}

		$$self.$$set = $$props => {
			if ('entry' in $$props) $$invalidate(0, entry = $$props.entry);
			if ('removeIcon' in $$props) $$invalidate(9, removeIcon = $$props.removeIcon);
			if ('indentIcon' in $$props) $$invalidate(1, indentIcon = $$props.indentIcon);
			if ('storageKey' in $$props) $$invalidate(2, storageKey = $$props.storageKey);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*entry, $storeCurrentPathURL*/ 1025) {
				$$invalidate(3, isCurrent = entry.path ? entry.path === $storeCurrentPathURL : false);
			}
		};

		return [
			entry,
			indentIcon,
			storageKey,
			isCurrent,
			iconsPrepend,
			storeCurrentPathURL,
			icon,
			path,
			onClick,
			removeIcon,
			$storeCurrentPathURL
		];
	}

	class Entry extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$e, create_fragment$e, safe_not_equal, {
				entry: 0,
				removeIcon: 9,
				indentIcon: 1,
				storageKey: 2
			});
		}
	}

	const Entry$1 = Entry;

	/**
	 * Provides a basic test for a given variable to test if it has the shape of a readable store by having a `subscribe`
	 * function.
	 *
	 * Note: functions are also objects, so test that the variable might be a function w/ a `subscribe` function.
	 *
	 * @param {*}  store - variable to test that might be a store.
	 *
	 * @returns {boolean} Whether the variable tested has the shape of a store.
	 */

	/**
	 * Provides a basic test for a given variable to test if it has the shape of a writable store by having a `subscribe`
	 * `set`, and `update` functions.
	 *
	 * Note: functions are also objects, so test that the variable might be a function w/ `subscribe` & `set` functions.
	 *
	 * @param {*}  store - variable to test that might be a store.
	 *
	 * @returns {boolean} Whether the variable tested has the shape of a store.
	 */
	function isWritableStore(store)
	{
	   if (store === null || store === void 0) { return false; }

	   switch (typeof store)
	   {
	      case 'function':
	      case 'object':
	         return typeof store.subscribe === 'function' && typeof store.set === 'function';
	   }

	   return false;
	}

	/**
	 * Subscribes to the given store with the update function provided and ignores the first automatic
	 * update. All future updates are dispatched to the update function.
	 *
	 * @param {import('svelte/store').Readable | import('svelte/store').Writable} store -
	 *  Store to subscribe to...
	 *
	 * @param {import('svelte/store').Updater} update - function to receive future updates.
	 *
	 * @returns {import('svelte/store').Unsubscriber} Store unsubscribe function.
	 */
	function subscribeIgnoreFirst(store, update)
	{
	   let firedFirst = false;

	   return store.subscribe((value) =>
	   {
	      if (!firedFirst)
	      {
	         firedFirst = true;
	      }
	      else
	      {
	         update(value);
	      }
	   });
	}

	/**
	 * Subscribes to the given store with two update functions provided. The first function is invoked on the initial
	 * subscription. All future updates are dispatched to the update function.
	 *
	 * @param {import('svelte/store').Readable | import('svelte/store').Writable} store -
	 *  Store to subscribe to...
	 *
	 * @param {import('svelte/store').Updater} first - Function to receive first update.
	 *
	 * @param {import('svelte/store').Updater} update - Function to receive future updates.
	 *
	 * @returns {import('svelte/store').Unsubscriber} Store unsubscribe function.
	 */
	function subscribeFirstRest(store, first, update)
	{
	   let firedFirst = false;

	   return store.subscribe((value) =>
	   {
	      if (!firedFirst)
	      {
	         firedFirst = true;
	         first(value);
	      }
	      else
	      {
	         update(value);
	      }
	   });
	}

	/**
	 * Provides a toggle action for `details` HTML elements. The boolean store provided controls animation.
	 *
	 * It is not necessary to bind the store to the `open` attribute of the associated details element.
	 *
	 * When the action is triggered to close the details element a data attribute `closing` is set to `true`. This allows
	 * any associated closing transitions to start immediately.
	 *
	 * @param {HTMLDetailsElement} details - The details element.
	 *
	 * @param {object} opts - Options parameters.
	 *
	 * @param {import('svelte/store').Writable<boolean>} opts.store - A boolean store.
	 *
	 * @param {boolean} [opts.animate=true] - When true animate close / open state with WAAPI.
	 *
	 * @param {boolean} [opts.clickActive=true] - When false click events are not handled.
	 *
	 * @returns {import('svelte/action').ActionReturn} Lifecycle functions.
	 */
	function toggleDetails(details, { store, animate = true, clickActive = true } = {})
	{
	   // Add closing data. Useful for animating chevron immediately while closing.
	   details.dataset.closing = 'false';

	   /** @type {HTMLElement} */
	   const summaryEl = details.querySelector('summary');

	   /** @type {HTMLElement} */
	   let contentEl = null;

	   // Find the first child that is not a summary element; this is the content element. When animating overflow is
	   // set to `hidden` to prevent scrollbars from activating.
	   for (const child of details.children)
	   {
	      if (child.tagName !== 'SUMMARY')
	      {
	         contentEl = child;
	         break;
	      }
	   }

	   /** @type {Animation} */
	   let animation;

	   /** @type {boolean} */
	   let open = details.open;  // eslint-disable-line no-shadow

	   // The store sets initial open state and handles animation on further changes.
	   let unsubscribe = subscribeFirstRest(store, (value) => { open = value; details.open = open; }, async (value) =>
	   {
	      open = value;

	      // Await `tick` to allow any conditional logic in the template to complete updating before handling animation.
	      await tick();

	      handleAnimation();
	   });

	   /**
	    * @param {number} a -
	    *
	    * @param {number} b -
	    *
	    * @param {boolean} value -
	    */
	   function animateWAAPI(a, b, value)
	   {
	      // Must guard when `b - a === 0`; add a small epsilon and wrap with Math.max.
	      const duration = Math.max(0, 30 * Math.log(Math.abs(b - a) + Number.EPSILON));

	      if (animate)
	      {
	         details.style.overflow = 'hidden';
	         if (contentEl) { contentEl.style.overflow = 'hidden'; }

	         animation = details.animate(
	          {
	             height: [`${a}px`, `${b}px`]
	          },
	          {
	             duration,
	             easing: 'ease-out'
	          }
	         );

	         animation.onfinish = () =>
	         {
	            details.open = value;
	            details.dataset.closing = 'false';
	            details.style.overflow = null;
	            if (contentEl) { contentEl.style.overflow = null; }
	         };
	      }
	      else
	      {
	         details.open = value;
	         details.dataset.closing = 'false';
	         details.style.overflow = null;
	         if (contentEl) { contentEl.style.overflow = null; }
	      }
	   }

	   /**
	    * Handles animation coordination based on current state.
	    */
	   function handleAnimation()
	   {
	      if (open)
	      {
	         const a = details.offsetHeight;
	         if (animation) { animation.cancel(); }
	         details.open = true;
	         const b = details.offsetHeight;

	         animateWAAPI(a, b, true);
	      }
	      else
	      {
	         const a = details.offsetHeight;
	         if (animation) { animation.cancel(); }
	         const b = summaryEl.offsetHeight;

	         details.dataset.closing = 'true';

	         animateWAAPI(a, b, false);
	      }
	   }

	   /**
	    * @param {MouseEvent} e - A mouse event.
	    */
	   function handleClick(e)
	   {
	      if (clickActive)
	      {
	         e.preventDefault();

	         // Simply set the store to the opposite of current open state and the callback above handles animation.
	         store.set(!open);
	      }
	   }

	   summaryEl.addEventListener('click', handleClick);

	   return {
	      update(options)
	      {
	         if (isWritableStore(options.store) && options.store !== store)
	         {
	            if (typeof unsubscribe === 'function') { unsubscribe(); }
	            store = options.store;

	            unsubscribe = subscribeFirstRest(store, (value) => { open = value; details.open = open; }, async (value) =>
	            {
	               open = value;

	               // Await `tick` to allow any conditional logic in the template to complete updating before handling
	               // animation.
	               await tick();

	               handleAnimation();
	            });
	         }

	         if (typeof options.animate === 'boolean') { animate = options.animate; }

	         if (typeof options.clickActive === 'boolean') { clickActive = options.clickActive; }
	      },
	      destroy()
	      {
	         unsubscribe();
	         summaryEl.removeEventListener('click', handleClick);
	      }
	   };
	}

	// Below is the static ResizeObserverManager ------------------------------------------------------------------------

	const s_MAP = new Map();

	/**
	 * Defines the various shape / update type of the given target.
	 *
	 * @type {Record<string, number>}
	 */
	const s_UPDATE_TYPES = {
	   none: 0,
	   attribute: 1,
	   function: 2,
	   resizeObserved: 3,
	   setContentBounds: 4,
	   setDimension: 5,
	   storeObject: 6,
	   storesObject: 7
	};

	new ResizeObserver((entries) =>
	{
	   for (const entry of entries)
	   {
	      const subscribers = s_MAP.get(entry?.target);

	      if (Array.isArray(subscribers))
	      {
	         const contentWidth = entry.contentRect.width;
	         const contentHeight = entry.contentRect.height;

	         for (const subscriber of subscribers)
	         {
	            s_UPDATE_SUBSCRIBER(subscriber, contentWidth, contentHeight);
	         }
	      }
	   }
	});

	/**
	 * Updates a subscriber target with given content width & height values. Offset width & height is calculated from
	 * the content values + cached styles.
	 *
	 * @param {object}            subscriber - Internal data about subscriber.
	 *
	 * @param {number|undefined}  contentWidth - ResizeObserver contentRect.width value or undefined.
	 *
	 * @param {number|undefined}  contentHeight - ResizeObserver contentRect.height value or undefined.
	 */
	function s_UPDATE_SUBSCRIBER(subscriber, contentWidth, contentHeight)
	{
	   const styles = subscriber.styles;

	   subscriber.contentWidth = contentWidth;
	   subscriber.contentHeight = contentHeight;

	   const offsetWidth = Number.isFinite(contentWidth) ? contentWidth + styles.additionalWidth : void 0;
	   const offsetHeight = Number.isFinite(contentHeight) ? contentHeight + styles.additionalHeight : void 0;

	   const target = subscriber.target;

	   switch (subscriber.updateType)
	   {
	      case s_UPDATE_TYPES.attribute:
	         target.contentWidth = contentWidth;
	         target.contentHeight = contentHeight;
	         target.offsetWidth = offsetWidth;
	         target.offsetHeight = offsetHeight;
	         break;

	      case s_UPDATE_TYPES.function:
	         target?.(offsetWidth, offsetHeight, contentWidth, contentHeight);
	         break;

	      case s_UPDATE_TYPES.resizeObserved:
	         target.resizeObserved?.(offsetWidth, offsetHeight, contentWidth, contentHeight);
	         break;

	      case s_UPDATE_TYPES.setContentBounds:
	         target.setContentBounds?.(contentWidth, contentHeight);
	         break;

	      case s_UPDATE_TYPES.setDimension:
	         target.setDimension?.(offsetWidth, offsetHeight);
	         break;

	      case s_UPDATE_TYPES.storeObject:
	         target.resizeObserved.update((object) =>
	         {
	            object.contentHeight = contentHeight;
	            object.contentWidth = contentWidth;
	            object.offsetHeight = offsetHeight;
	            object.offsetWidth = offsetWidth;

	            return object;
	         });
	         break;

	      case s_UPDATE_TYPES.storesObject:
	         target.stores.resizeObserved.update((object) =>
	         {
	            object.contentHeight = contentHeight;
	            object.contentWidth = contentWidth;
	            object.offsetHeight = offsetHeight;
	            object.offsetWidth = offsetWidth;

	            return object;
	         });
	         break;
	   }
	}

	/**
	 * Provides an action to apply style properties provided as an object.
	 *
	 * @param {HTMLElement} node - Target element
	 *
	 * @param {Record<string, string>}  properties - Key / value object of properties to set.
	 *
	 * @returns {import('svelte/action').ActionReturn<Record<string, string>>} Lifecycle functions.
	 */
	function applyStyles(node, properties)
	{
	   /** Sets properties on node. */
	   function setProperties()
	   {
	      if (!isObject(properties)) { return; }

	      for (const prop of Object.keys(properties))
	      {
	         node.style.setProperty(`${prop}`, properties[prop]);
	      }
	   }

	   setProperties();

	   return {
	      /**
	       * @param {Record<string, string>}  newProperties - Key / value object of properties to set.
	       */
	      update: (newProperties) =>
	      {
	         properties = newProperties;
	         setProperties();
	      }
	   };
	}

	/**
	 * Provides basic duck typing to determine if the provided function is a constructor function for a Svelte component.
	 *
	 * @param {*}  comp - Data to check as a Svelte component.
	 *
	 * @returns {boolean} Whether basic duck typing succeeds.
	 */
	function isSvelteComponent(comp)
	{
	   if (comp === null || comp === void 0 || typeof comp !== 'function') { return false; }

	   // When using Vite in a developer build the SvelteComponent is wrapped in a ProxyComponent class.
	   // This class doesn't define methods on the prototype, so we must check if the constructor name
	   // starts with `Proxy<` as it provides the wrapped component as `Proxy<_wrapped component name_>`.
	   const prototypeName = comp?.prototype?.constructor?.name;
	   if (typeof prototypeName === 'string' && (prototypeName.startsWith('Proxy<') || prototypeName === 'ProxyComponent'))
	   {
	      return true;
	   }

	   return typeof window !== 'undefined' ?
	    typeof comp.prototype.$destroy === 'function' && typeof comp.prototype.$on === 'function' : // client-side
	     typeof comp.render === 'function'; // server-side
	}

	/* src\components\navigation\TJSSvgFolder.svelte generated by Svelte v4.2.8 */
	const get_summary_end_slot_changes = dirty => ({});
	const get_summary_end_slot_context = ctx => ({});
	const get_label_slot_changes = dirty => ({});
	const get_label_slot_context = ctx => ({});

	// (441:6) {#if localOptions.focusIndicator}
	function create_if_block_4(ctx) {
		let div;

		return {
			c() {
				div = element("div");
				attr(div, "class", "tjs-folder-focus-indicator svelte-9arcsc");
			},
			m(target, anchor) {
				insert(target, div, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	// (448:9) {:else}
	function create_else_block$2(ctx) {
		let div;
		let t;

		return {
			c() {
				div = element("div");
				t = text(/*label*/ ctx[2]);
				attr(div, "class", "label svelte-9arcsc");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, t);
				/*div_binding*/ ctx[36](div);
			},
			p(ctx, dirty) {
				if (dirty[0] & /*label*/ 4) set_data(t, /*label*/ ctx[2]);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				/*div_binding*/ ctx[36](null);
			}
		};
	}

	// (446:9) {#if isSvelteComponent(folder?.slotLabel?.class)}
	function create_if_block_3(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;

		const switch_instance_spread_levels = [
			isObject(/*folder*/ ctx[5]?.slotLabel?.props)
			? /*folder*/ ctx[5].slotLabel.props
			: {}
		];

		var switch_value = /*folder*/ ctx[5].slotLabel.class;

		function switch_props(ctx, dirty) {
			let switch_instance_props = {};

			if (dirty !== undefined && dirty[0] & /*folder*/ 32) {
				switch_instance_props = get_spread_update(switch_instance_spread_levels, [
					get_spread_object(isObject(/*folder*/ ctx[5]?.slotLabel?.props)
					? /*folder*/ ctx[5].slotLabel.props
					: {})
				]);
			} else {
				for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
					switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
				}
			}

			return { props: switch_instance_props };
		}

		if (switch_value) {
			switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
		}

		return {
			c() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert(target, switch_instance_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty[0] & /*folder*/ 32 && switch_value !== (switch_value = /*folder*/ ctx[5].slotLabel.class)) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component(switch_value, switch_props(ctx, dirty));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					const switch_instance_changes = (dirty[0] & /*folder*/ 32)
					? get_spread_update(switch_instance_spread_levels, [
							get_spread_object(isObject(/*folder*/ ctx[5]?.slotLabel?.props)
							? /*folder*/ ctx[5].slotLabel.props
							: {})
						])
					: {};

					switch_instance.$set(switch_instance_changes);
				}
			},
			i(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};
	}

	// (445:23)            
	function fallback_block_2(ctx) {
		let show_if;
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block_3, create_else_block$2];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (dirty[0] & /*folder*/ 32) show_if = null;
			if (show_if == null) show_if = !!isSvelteComponent(/*folder*/ ctx[5]?.slotLabel?.class);
			if (show_if) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx, [-1, -1]);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx, dirty);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	// (454:9) {#if isSvelteComponent(folder?.slotSummaryEnd?.class)}
	function create_if_block_2$2(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;

		const switch_instance_spread_levels = [
			isObject(/*folder*/ ctx[5]?.slotSummaryEnd?.props)
			? /*folder*/ ctx[5].slotSummaryEnd.props
			: {}
		];

		var switch_value = /*folder*/ ctx[5].slotSummaryEnd.class;

		function switch_props(ctx, dirty) {
			let switch_instance_props = {};

			if (dirty !== undefined && dirty[0] & /*folder*/ 32) {
				switch_instance_props = get_spread_update(switch_instance_spread_levels, [
					get_spread_object(isObject(/*folder*/ ctx[5]?.slotSummaryEnd?.props)
					? /*folder*/ ctx[5].slotSummaryEnd.props
					: {})
				]);
			} else {
				for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
					switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
				}
			}

			return { props: switch_instance_props };
		}

		if (switch_value) {
			switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
		}

		return {
			c() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert(target, switch_instance_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty[0] & /*folder*/ 32 && switch_value !== (switch_value = /*folder*/ ctx[5].slotSummaryEnd.class)) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component(switch_value, switch_props(ctx, dirty));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					const switch_instance_changes = (dirty[0] & /*folder*/ 32)
					? get_spread_update(switch_instance_spread_levels, [
							get_spread_object(isObject(/*folder*/ ctx[5]?.slotSummaryEnd?.props)
							? /*folder*/ ctx[5].slotSummaryEnd.props
							: {})
						])
					: {};

					switch_instance.$set(switch_instance_changes);
				}
			},
			i(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};
	}

	// (453:31)            
	function fallback_block_1(ctx) {
		let show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotSummaryEnd?.class);
		let if_block_anchor;
		let current;
		let if_block = show_if && create_if_block_2$2(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty[0] & /*folder*/ 32) show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotSummaryEnd?.class);

				if (show_if) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty[0] & /*folder*/ 32) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_2$2(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	// (461:6) {#if visible}
	function create_if_block$8(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[27].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[26], null);
		const default_slot_or_fallback = default_slot || fallback_block(ctx);

		return {
			c() {
				if (default_slot_or_fallback) default_slot_or_fallback.c();
			},
			m(target, anchor) {
				if (default_slot_or_fallback) {
					default_slot_or_fallback.m(target, anchor);
				}

				current = true;
			},
			p(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 67108864)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[26], dirty, null),
							null
						);
					}
				} else {
					if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty[0] & /*folder*/ 32)) {
						default_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot_or_fallback, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot_or_fallback, local);
				current = false;
			},
			d(detaching) {
				if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
			}
		};
	}

	// (463:12) {#if isSvelteComponent(folder?.slotDefault?.class)}
	function create_if_block_1$2(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;

		const switch_instance_spread_levels = [
			isObject(/*folder*/ ctx[5]?.slotDefault?.props)
			? /*folder*/ ctx[5].slotDefault.props
			: {}
		];

		var switch_value = /*folder*/ ctx[5].slotDefault.class;

		function switch_props(ctx, dirty) {
			let switch_instance_props = {};

			if (dirty !== undefined && dirty[0] & /*folder*/ 32) {
				switch_instance_props = get_spread_update(switch_instance_spread_levels, [
					get_spread_object(isObject(/*folder*/ ctx[5]?.slotDefault?.props)
					? /*folder*/ ctx[5].slotDefault.props
					: {})
				]);
			} else {
				for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
					switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
				}
			}

			return { props: switch_instance_props };
		}

		if (switch_value) {
			switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
		}

		return {
			c() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert(target, switch_instance_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty[0] & /*folder*/ 32 && switch_value !== (switch_value = /*folder*/ ctx[5].slotDefault.class)) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component(switch_value, switch_props(ctx, dirty));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					const switch_instance_changes = (dirty[0] & /*folder*/ 32)
					? get_spread_update(switch_instance_spread_levels, [
							get_spread_object(isObject(/*folder*/ ctx[5]?.slotDefault?.props)
							? /*folder*/ ctx[5].slotDefault.props
							: {})
						])
					: {};

					switch_instance.$set(switch_instance_changes);
				}
			},
			i(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};
	}

	// (462:15)               
	function fallback_block(ctx) {
		let show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotDefault?.class);
		let if_block_anchor;
		let current;
		let if_block = show_if && create_if_block_1$2(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty[0] & /*folder*/ 32) show_if = isSvelteComponent(/*folder*/ ctx[5]?.slotDefault?.class);

				if (show_if) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty[0] & /*folder*/ 32) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_1$2(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	function create_fragment$d(ctx) {
		let details;
		let summary;
		let svg;
		let path;
		let t0;
		let t1;
		let t2;
		let t3;
		let div;
		let toggleDetails_action;
		let applyStyles_action;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*localOptions*/ ctx[8].focusIndicator && create_if_block_4();
		const label_slot_template = /*#slots*/ ctx[27].label;
		const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[26], get_label_slot_context);
		const label_slot_or_fallback = label_slot || fallback_block_2(ctx);
		const summary_end_slot_template = /*#slots*/ ctx[27]["summary-end"];
		const summary_end_slot = create_slot(summary_end_slot_template, ctx, /*$$scope*/ ctx[26], get_summary_end_slot_context);
		const summary_end_slot_or_fallback = summary_end_slot || fallback_block_1(ctx);
		let if_block1 = /*visible*/ ctx[12] && create_if_block$8(ctx);

		return {
			c() {
				details = element("details");
				summary = element("summary");
				svg = svg_element("svg");
				path = svg_element("path");
				t0 = space();
				if (if_block0) if_block0.c();
				t1 = space();
				if (label_slot_or_fallback) label_slot_or_fallback.c();
				t2 = space();
				if (summary_end_slot_or_fallback) summary_end_slot_or_fallback.c();
				t3 = space();
				div = element("div");
				if (if_block1) if_block1.c();
				attr(path, "fill", "currentColor");
				attr(path, "stroke", "currentColor");
				set_style(path, "stroke-linejoin", "round");
				set_style(path, "stroke-width", "3");
				attr(path, "d", "M5,8L19,8L12,15Z");
				attr(svg, "viewBox", "0 0 24 24");
				attr(svg, "class", "svelte-9arcsc");
				toggle_class(svg, "focus-chevron", /*localOptions*/ ctx[8].focusChevron);
				attr(summary, "role", "button");
				attr(summary, "tabindex", "0");
				attr(summary, "class", "svelte-9arcsc");
				toggle_class(summary, "default-cursor", /*localOptions*/ ctx[8].chevronOnly);
				toggle_class(summary, "remove-focus-visible", /*localOptions*/ ctx[8].focusIndicator || /*localOptions*/ ctx[8].focusChevron);
				attr(div, "class", "contents svelte-9arcsc");
				attr(details, "class", "tjs-svg-folder svelte-9arcsc");
				attr(details, "data-id", /*id*/ ctx[1]);
				attr(details, "data-label", /*label*/ ctx[2]);
				attr(details, "data-closing", "false");
			},
			m(target, anchor) {
				insert(target, details, anchor);
				append(details, summary);
				append(summary, svg);
				append(svg, path);
				/*svg_binding*/ ctx[35](svg);
				append(summary, t0);
				if (if_block0) if_block0.m(summary, null);
				append(summary, t1);

				if (label_slot_or_fallback) {
					label_slot_or_fallback.m(summary, null);
				}

				append(summary, t2);

				if (summary_end_slot_or_fallback) {
					summary_end_slot_or_fallback.m(summary, null);
				}

				/*summary_binding*/ ctx[37](summary);
				append(details, t3);
				append(details, div);
				if (if_block1) if_block1.m(div, null);
				/*details_binding*/ ctx[38](details);
				current = true;

				if (!mounted) {
					dispose = [
						listen(summary, "click", /*onClickSummary*/ ctx[13]),
						listen(summary, "contextmenu", /*onContextMenuPress*/ ctx[14]),
						listen(summary, "keydown", /*onKeyDown*/ ctx[15], true),
						listen(summary, "keyup", /*onKeyUp*/ ctx[16], true),
						listen(details, "close", /*onLocalClose*/ ctx[17]),
						listen(details, "open", /*onLocalOpen*/ ctx[18]),
						listen(details, "toggle", /*toggle_handler*/ ctx[39]),
						listen(details, "click", /*click_handler*/ ctx[28]),
						listen(details, "keydown", /*keydown_handler*/ ctx[29]),
						listen(details, "keyup", /*keyup_handler*/ ctx[30]),
						listen(details, "open", /*open_handler*/ ctx[31]),
						listen(details, "close", /*close_handler*/ ctx[32]),
						listen(details, "openAny", /*openAny_handler*/ ctx[33]),
						listen(details, "closeAny", /*closeAny_handler*/ ctx[34]),
						action_destroyer(toggleDetails_action = toggleDetails.call(null, details, {
							store: /*store*/ ctx[3],
							animate: /*animate*/ ctx[0],
							clickActive: false
						})),
						action_destroyer(applyStyles_action = applyStyles.call(null, details, /*styles*/ ctx[4]))
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (!current || dirty[0] & /*localOptions*/ 256) {
					toggle_class(svg, "focus-chevron", /*localOptions*/ ctx[8].focusChevron);
				}

				if (/*localOptions*/ ctx[8].focusIndicator) {
					if (if_block0) ; else {
						if_block0 = create_if_block_4();
						if_block0.c();
						if_block0.m(summary, t1);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (label_slot) {
					if (label_slot.p && (!current || dirty[0] & /*$$scope*/ 67108864)) {
						update_slot_base(
							label_slot,
							label_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(label_slot_template, /*$$scope*/ ctx[26], dirty, get_label_slot_changes),
							get_label_slot_context
						);
					}
				} else {
					if (label_slot_or_fallback && label_slot_or_fallback.p && (!current || dirty[0] & /*folder, labelEl, label*/ 548)) {
						label_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
					}
				}

				if (summary_end_slot) {
					if (summary_end_slot.p && (!current || dirty[0] & /*$$scope*/ 67108864)) {
						update_slot_base(
							summary_end_slot,
							summary_end_slot_template,
							ctx,
							/*$$scope*/ ctx[26],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[26])
							: get_slot_changes(summary_end_slot_template, /*$$scope*/ ctx[26], dirty, get_summary_end_slot_changes),
							get_summary_end_slot_context
						);
					}
				} else {
					if (summary_end_slot_or_fallback && summary_end_slot_or_fallback.p && (!current || dirty[0] & /*folder*/ 32)) {
						summary_end_slot_or_fallback.p(ctx, !current ? [-1, -1] : dirty);
					}
				}

				if (!current || dirty[0] & /*localOptions*/ 256) {
					toggle_class(summary, "default-cursor", /*localOptions*/ ctx[8].chevronOnly);
				}

				if (!current || dirty[0] & /*localOptions*/ 256) {
					toggle_class(summary, "remove-focus-visible", /*localOptions*/ ctx[8].focusIndicator || /*localOptions*/ ctx[8].focusChevron);
				}

				if (/*visible*/ ctx[12]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty[0] & /*visible*/ 4096) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$8(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(div, null);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}

				if (!current || dirty[0] & /*id*/ 2) {
					attr(details, "data-id", /*id*/ ctx[1]);
				}

				if (!current || dirty[0] & /*label*/ 4) {
					attr(details, "data-label", /*label*/ ctx[2]);
				}

				if (toggleDetails_action && is_function(toggleDetails_action.update) && dirty[0] & /*store, animate*/ 9) toggleDetails_action.update.call(null, {
					store: /*store*/ ctx[3],
					animate: /*animate*/ ctx[0],
					clickActive: false
				});

				if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*styles*/ 16) applyStyles_action.update.call(null, /*styles*/ ctx[4]);
			},
			i(local) {
				if (current) return;
				transition_in(label_slot_or_fallback, local);
				transition_in(summary_end_slot_or_fallback, local);
				transition_in(if_block1);
				current = true;
			},
			o(local) {
				transition_out(label_slot_or_fallback, local);
				transition_out(summary_end_slot_or_fallback, local);
				transition_out(if_block1);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(details);
				}

				/*svg_binding*/ ctx[35](null);
				if (if_block0) if_block0.d();
				if (label_slot_or_fallback) label_slot_or_fallback.d(detaching);
				if (summary_end_slot_or_fallback) summary_end_slot_or_fallback.d(detaching);
				/*summary_binding*/ ctx[37](null);
				if (if_block1) if_block1.d();
				/*details_binding*/ ctx[38](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$d($$self, $$props, $$invalidate) {
		let $store,
			$$unsubscribe_store = noop,
			$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(7, $store = $$value)), store);

		$$self.$$.on_destroy.push(() => $$unsubscribe_store());
		let { $$slots: slots = {}, $$scope } = $$props;
		let { folder = void 0 } = $$props;
		let { animate = void 0 } = $$props;
		let { id = void 0 } = $$props;
		let { label = void 0 } = $$props;
		let { keyCode = void 0 } = $$props;
		let { options = void 0 } = $$props;
		let { store = void 0 } = $$props;
		$$subscribe_store();
		let { styles = void 0 } = $$props;
		let { onClose = void 0 } = $$props;
		let { onOpen = void 0 } = $$props;
		let { onContextMenu = void 0 } = $$props;
		const application = getContext('#external')?.application;

		/** @type {TJSFolderOptions} */
		const localOptions = {
			chevronOnly: false,
			focusChevron: false,
			focusIndicator: false
		};

		let detailsEl, labelEl, summaryEl, svgEl;
		let storeUnsubscribe;

		// For performance reasons when the folder is closed the main slot is not rendered.
		// When the folder is closed `visible` is set to false with a slight delay to allow the closing animation to
		// complete.
		let visible = $store;

		let timeoutId;
		onDestroy(() => storeUnsubscribe());

		/**
	 * Create a CustomEvent with details object containing relevant element and props.
	 *
	 * @param {string}   type - Event name / type.
	 *
	 * @param {boolean}  [bubbles=false] - Does the event bubble.
	 *
	 * @returns {CustomEvent<object>}
	 */
		function createEvent(type, bubbles = false) {
			return new CustomEvent(type,
			{
					detail: {
						element: detailsEl,
						folder,
						id,
						label,
						store
					},
					bubbles
				});
		}

		/**
	 * Handles opening / closing the details element from either click or keyboard event when summary focused.
	 *
	 * @param {KeyboardEvent | PointerEvent} event - Event.
	 *
	 * @param {boolean} [fromKeyboard=false] - True when event is coming from keyboard. This is used to ignore the
	 * chevronOnly click event handling.
	 */
		function handleOpenClose(event, fromKeyboard = false) {
			const target = event.target;
			const chevronTarget = target === svgEl || svgEl.contains(target);

			if (target === summaryEl || target === labelEl || chevronTarget) {
				if (!fromKeyboard && localOptions.chevronOnly && !chevronTarget) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}

				set_store_value(store, $store = !$store, $store);

				if ($store && typeof onOpen === 'function') {
					onOpen({
						event,
						element: detailsEl,
						folder,
						id,
						label,
						store
					});
				} else if (!$store && typeof onClose === 'function') {
					onClose({
						event,
						element: detailsEl,
						folder,
						id,
						label,
						store
					});
				}
			}

			event.preventDefault();
			event.stopPropagation();
		}

		/**
	 * Detects whether the summary click came from a pointer / mouse device or the keyboard. If from the keyboard and
	 * the active element is `summaryEl` then no action is taken and `onKeyDown` will handle the key event to open /
	 * close the detail element.
	 *
	 * @param {PointerEvent|MouseEvent} event
	 */
		function onClickSummary(event) {
			const activeWindow = application?.reactive?.activeWindow ?? globalThis;

			// Firefox sends a `click` event / non-standard response so check for mozInputSource equaling 6 (keyboard) or
			// a negative pointerId from Chromium and prevent default. This allows `onKeyUp` to handle any open / close
			// action.
			if (activeWindow.document.activeElement === summaryEl && (event?.pointerId === -1 || event?.mozInputSource === 6)) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			handleOpenClose(event);
		}

		/**
	 * Handles a context menu press forwarding the event to the handler.
	 *
	 * @param {PointerEvent} event - PointerEvent.
	 */
		function onContextMenuPress(event) {
			if (typeof onContextMenu === 'function') {
				onContextMenu({ event });
			}
		}

		/**
	 * Detect if the key event came from the active tabbed / focused summary element and `options.keyCode` matches.
	 *
	 * @param {KeyboardEvent} event -
	 */
		function onKeyDown(event) {
			const activeWindow = application?.reactive?.activeWindow ?? globalThis;

			if (activeWindow.document.activeElement === summaryEl && event.code === keyCode) {
				event.preventDefault();
				event.stopPropagation();
			}
		}

		/**
	 * Detect if the key event came from the active tabbed / focused summary element and `options.keyCode` matches.
	 *
	 * @param {KeyboardEvent} event -
	 */
		function onKeyUp(event) {
			const activeWindow = application?.reactive?.activeWindow ?? globalThis;

			if (activeWindow.document.activeElement === summaryEl && event.code === keyCode) {
				handleOpenClose(event, true);
				event.preventDefault();
				event.stopPropagation();
			}
		}

		/**
	 * Handle receiving bubbled event from summary or content to close details / content.
	 */
		function onLocalClose(event) {
			event.preventDefault();
			event.stopPropagation();
			store.set(false);
		}

		/**
	 * Handle receiving bubbled event from summary bar to open details / content.
	 */
		function onLocalOpen(event) {
			event.preventDefault();
			event.stopPropagation();
			store.set(true);
		}

		function click_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keydown_handler(event) {
			bubble.call(this, $$self, event);
		}

		function keyup_handler(event) {
			bubble.call(this, $$self, event);
		}

		function open_handler(event) {
			bubble.call(this, $$self, event);
		}

		function close_handler(event) {
			bubble.call(this, $$self, event);
		}

		function openAny_handler(event) {
			bubble.call(this, $$self, event);
		}

		function closeAny_handler(event) {
			bubble.call(this, $$self, event);
		}

		function svg_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				svgEl = $$value;
				$$invalidate(11, svgEl);
			});
		}

		function div_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				labelEl = $$value;
				$$invalidate(9, labelEl);
			});
		}

		function summary_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				summaryEl = $$value;
				$$invalidate(10, summaryEl);
			});
		}

		function details_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				detailsEl = $$value;
				$$invalidate(6, detailsEl);
			});
		}

		const toggle_handler = () => $$invalidate(6, detailsEl.open = $store, detailsEl);

		$$self.$$set = $$props => {
			if ('folder' in $$props) $$invalidate(5, folder = $$props.folder);
			if ('animate' in $$props) $$invalidate(0, animate = $$props.animate);
			if ('id' in $$props) $$invalidate(1, id = $$props.id);
			if ('label' in $$props) $$invalidate(2, label = $$props.label);
			if ('keyCode' in $$props) $$invalidate(19, keyCode = $$props.keyCode);
			if ('options' in $$props) $$invalidate(20, options = $$props.options);
			if ('store' in $$props) $$subscribe_store($$invalidate(3, store = $$props.store));
			if ('styles' in $$props) $$invalidate(4, styles = $$props.styles);
			if ('onClose' in $$props) $$invalidate(21, onClose = $$props.onClose);
			if ('onOpen' in $$props) $$invalidate(22, onOpen = $$props.onOpen);
			if ('onContextMenu' in $$props) $$invalidate(23, onContextMenu = $$props.onContextMenu);
			if ('$$scope' in $$props) $$invalidate(26, $$scope = $$props.$$scope);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty[0] & /*folder, animate*/ 33) {
				$$invalidate(0, animate = isObject(folder) && typeof folder.animate === 'boolean'
				? folder.animate
				: typeof animate === 'boolean' ? animate : true);
			}

			if ($$self.$$.dirty[0] & /*folder, id*/ 34) {
				$$invalidate(1, id = isObject(folder) && typeof folder.id === 'string'
				? folder.id
				: typeof id === 'string' ? id : void 0);
			}

			if ($$self.$$.dirty[0] & /*folder, label*/ 36) {
				$$invalidate(2, label = isObject(folder) && typeof folder.label === 'string'
				? folder.label
				: typeof label === 'string' ? label : '');
			}

			if ($$self.$$.dirty[0] & /*folder, keyCode*/ 524320) {
				$$invalidate(19, keyCode = isObject(folder) && typeof folder.keyCode === 'string'
				? folder.keyCode
				: typeof keyCode === 'string' ? keyCode : 'Enter');
			}

			if ($$self.$$.dirty[0] & /*folder, options*/ 1048608) {
				{
					$$invalidate(20, options = isObject(folder) && isObject(folder.options)
					? folder.options
					: isObject(options) ? options : {});

					if (typeof options?.chevronOnly === 'boolean') {
						$$invalidate(8, localOptions.chevronOnly = options.chevronOnly, localOptions);
					}

					if (typeof options?.focusChevron === 'boolean') {
						$$invalidate(8, localOptions.focusChevron = options.focusChevron, localOptions);
					}

					if (typeof options?.focusIndicator === 'boolean') {
						$$invalidate(8, localOptions.focusIndicator = options.focusIndicator, localOptions);
					}
				}
			}

			if ($$self.$$.dirty[0] & /*folder, store, storeUnsubscribe, detailsEl*/ 16777320) {
				{
					$$subscribe_store($$invalidate(3, store = isObject(folder) && isWritableStore(folder.store)
					? folder.store
					: isWritableStore(store) ? store : writable(false)));

					if (typeof storeUnsubscribe === 'function') {
						storeUnsubscribe();
					}

					// Manually subscribe to store in order to trigger only on changes; avoids initial dispatch on mount as `detailsEl`
					// is not set yet. Directly dispatch custom events as Svelte 3 does not support bubbling of custom events by
					// `createEventDispatcher`.
					$$invalidate(24, storeUnsubscribe = subscribeIgnoreFirst(store, value => {
						if (detailsEl) {
							detailsEl.dispatchEvent(createEvent(value ? 'open' : 'close'));
							detailsEl.dispatchEvent(createEvent(value ? 'openAny' : 'closeAny', true));
						}
					}));
				}
			}

			if ($$self.$$.dirty[0] & /*folder, styles*/ 48) {
				$$invalidate(4, styles = isObject(folder) && isObject(folder.styles)
				? folder.styles
				: isObject(styles) ? styles : void 0);
			}

			if ($$self.$$.dirty[0] & /*folder, onClose*/ 2097184) {
				$$invalidate(21, onClose = isObject(folder) && typeof folder.onClose === 'function'
				? folder.onClose
				: typeof onClose === 'function' ? onClose : void 0);
			}

			if ($$self.$$.dirty[0] & /*folder, onOpen*/ 4194336) {
				$$invalidate(22, onOpen = isObject(folder) && typeof folder.onOpen === 'function'
				? folder.onOpen
				: typeof onOpen === 'function' ? onOpen : void 0);
			}

			if ($$self.$$.dirty[0] & /*folder, onContextMenu*/ 8388640) {
				$$invalidate(23, onContextMenu = isObject(folder) && typeof folder.onContextMenu === 'function'
				? folder.onContextMenu
				: typeof onContextMenu === 'function'
					? onContextMenu
					: void 0);
			}

			if ($$self.$$.dirty[0] & /*$store, timeoutId*/ 33554560) {
				if (!$store) {
					$$invalidate(25, timeoutId = setTimeout(() => $$invalidate(12, visible = false), 500));
				} else {
					clearTimeout(timeoutId);
					$$invalidate(12, visible = true);
				}
			}
		};

		return [
			animate,
			id,
			label,
			store,
			styles,
			folder,
			detailsEl,
			$store,
			localOptions,
			labelEl,
			summaryEl,
			svgEl,
			visible,
			onClickSummary,
			onContextMenuPress,
			onKeyDown,
			onKeyUp,
			onLocalClose,
			onLocalOpen,
			keyCode,
			options,
			onClose,
			onOpen,
			onContextMenu,
			storeUnsubscribe,
			timeoutId,
			$$scope,
			slots,
			click_handler,
			keydown_handler,
			keyup_handler,
			open_handler,
			close_handler,
			openAny_handler,
			closeAny_handler,
			svg_binding,
			div_binding,
			summary_binding,
			details_binding,
			toggle_handler
		];
	}

	class TJSSvgFolder extends SvelteComponent {
		constructor(options) {
			super();

			init(
				this,
				options,
				instance$d,
				create_fragment$d,
				safe_not_equal,
				{
					folder: 5,
					animate: 0,
					id: 1,
					label: 2,
					keyCode: 19,
					options: 20,
					store: 3,
					styles: 4,
					onClose: 21,
					onOpen: 22,
					onContextMenu: 23
				},
				null,
				[-1, -1]
			);
		}
	}

	const TJSSvgFolder$1 = TJSSvgFolder;

	/* src\components\navigation\Folder.svelte generated by Svelte v4.2.8 */

	function get_each_context$5(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		return child_ctx;
	}

	// (70:6) {:else}
	function create_else_block$1(ctx) {
		let entry_1;
		let current;

		entry_1 = new Entry$1({
				props: {
					entry: /*child*/ ctx[15],
					indentIcon: /*indentIcon*/ ctx[6],
					removeIcon: !/*navModuleIcon*/ ctx[2] && /*child*/ ctx[15]?.kind === 2
				}
			});

		return {
			c() {
				create_component(entry_1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(entry_1, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const entry_1_changes = {};
				if (dirty & /*entry*/ 1) entry_1_changes.entry = /*child*/ ctx[15];
				if (dirty & /*entry*/ 1) entry_1_changes.removeIcon = !/*navModuleIcon*/ ctx[2] && /*child*/ ctx[15]?.kind === 2;
				entry_1.$set(entry_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(entry_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(entry_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(entry_1, detaching);
			}
		};
	}

	// (68:6) {#if Array.isArray(child.children)}
	function create_if_block$7(ctx) {
		let folder_1;
		let current;

		folder_1 = new Folder({
				props: {
					entry: /*child*/ ctx[15],
					parentIcon: !/*removeIcon*/ ctx[5]
				}
			});

		return {
			c() {
				create_component(folder_1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(folder_1, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const folder_1_changes = {};
				if (dirty & /*entry*/ 1) folder_1_changes.entry = /*child*/ ctx[15];
				folder_1.$set(folder_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(folder_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(folder_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(folder_1, detaching);
			}
		};
	}

	// (67:3) {#each entry.children as child (child.path)}
	function create_each_block$5(key_1, ctx) {
		let first;
		let show_if;
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$7, create_else_block$1];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (dirty & /*entry*/ 1) show_if = null;
			if (show_if == null) show_if = !!Array.isArray(/*child*/ ctx[15].children);
			if (show_if) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx, -1);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				if_block.c();
				if_block_anchor = empty();
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx, dirty);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	// (65:0) <TJSSvgFolder {folder} {animate} {onClose} {onOpen}>
	function create_default_slot(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let current;
		let each_value = ensure_array_like(/*entry*/ ctx[0].children);
		const get_key = ctx => /*child*/ ctx[15].path;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$5(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$5(key, child_ctx));
		}

		return {
			c() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert(target, each_1_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty & /*entry, removeIcon, Array, indentIcon, navModuleIcon*/ 101) {
					each_value = ensure_array_like(/*entry*/ ctx[0].children);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block$5, each_1_anchor, get_each_context$5);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(each_1_anchor);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d(detaching);
				}
			}
		};
	}

	// (66:3) 
	function create_label_slot(ctx) {
		let entry_1;
		let current;

		entry_1 = new Entry$1({
				props: {
					entry: /*entry*/ ctx[0],
					removeIcon: /*removeIcon*/ ctx[5],
					storageKey: /*storageKey*/ ctx[4],
					slot: "label"
				}
			});

		return {
			c() {
				create_component(entry_1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(entry_1, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const entry_1_changes = {};
				if (dirty & /*entry*/ 1) entry_1_changes.entry = /*entry*/ ctx[0];
				entry_1.$set(entry_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(entry_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(entry_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(entry_1, detaching);
			}
		};
	}

	function create_fragment$c(ctx) {
		let tjssvgfolder;
		let current;

		tjssvgfolder = new TJSSvgFolder$1({
				props: {
					folder: /*folder*/ ctx[7],
					animate: /*animate*/ ctx[1],
					onClose: /*onClose*/ ctx[8],
					onOpen: /*onOpen*/ ctx[9],
					$$slots: {
						label: [create_label_slot],
						default: [create_default_slot]
					},
					$$scope: { ctx }
				}
			});

		return {
			c() {
				create_component(tjssvgfolder.$$.fragment);
			},
			m(target, anchor) {
				mount_component(tjssvgfolder, target, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				const tjssvgfolder_changes = {};
				if (dirty & /*animate*/ 2) tjssvgfolder_changes.animate = /*animate*/ ctx[1];

				if (dirty & /*$$scope, entry*/ 262145) {
					tjssvgfolder_changes.$$scope = { dirty, ctx };
				}

				tjssvgfolder.$set(tjssvgfolder_changes);
			},
			i(local) {
				if (current) return;
				transition_in(tjssvgfolder.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(tjssvgfolder.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(tjssvgfolder, detaching);
			}
		};
	}

	function instance$c($$self, $$props, $$invalidate) {
		let animate;
		let $storeSettingAnimate;
		let { entry } = $$props;
		let { parentIcon = false } = $$props;

		const { dmtSessionStorage, state } = /** @type {NavigationData} */
		getContext('#navigationData');

		const navModuleIcon = getContext('#navModuleIcon');
		const storeSettingAnimate = getContext('#storeSettingAnimate');
		component_subscribe($$self, storeSettingAnimate, value => $$invalidate(11, $storeSettingAnimate = value));
		const storageKey = entry.storageKey;

		const store = storageKey
		? dmtSessionStorage.getStore(storageKey, false)
		: void 0;

		const removeIcon = !navModuleIcon && (entry.kind === void 0 || entry.kind === 2);
		const indentIcon = !removeIcon ? 'indent-icon' : 'indent-no-icon';

		const folder = {
			store,
			options: { focusChevron: true },
			// Dynamically set the folder margin based on whether the parent folder has a svg icon.
			styles: parentIcon
			? {
					'--tjs-folder-details-margin-left': '3.5px'
				}
			: void 0
		};

		/**
	 * Handle closing all child folders if the `Alt` key is pressed when this folder is closed.
	 *
	 * @param {{ event: MouseEvent | KeyboardEvent }} data - On close data.
	 */
		function onClose(data) {
			if (data?.event?.altKey) {
				state.setChildFolderState(entry, false);
			}
		}

		/**
	 * Handle opening all child folders if the `Alt` key is pressed when this folder is opened.
	 *
	 * @param {{ event: MouseEvent | KeyboardEvent }} data - On open data.
	 */
		function onOpen(data) {
			if (data?.event?.altKey) {
				state.setChildFolderState(entry, true);
			}
		}

		$$self.$$set = $$props => {
			if ('entry' in $$props) $$invalidate(0, entry = $$props.entry);
			if ('parentIcon' in $$props) $$invalidate(10, parentIcon = $$props.parentIcon);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$storeSettingAnimate*/ 2048) {
				// Theme animation local storage state.
				$$invalidate(1, animate = $storeSettingAnimate);
			}
		};

		return [
			entry,
			animate,
			navModuleIcon,
			storeSettingAnimate,
			storageKey,
			removeIcon,
			indentIcon,
			folder,
			onClose,
			onOpen,
			parentIcon,
			$storeSettingAnimate
		];
	}

	class Folder extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$c, create_fragment$c, safe_not_equal, { entry: 0, parentIcon: 10 });
		}
	}

	const Folder$1 = Folder;

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	/**
	 * https://svelte.dev/docs/svelte-easing
	 * @param {number} t
	 * @returns {number}
	 */
	function cubicOut(t) {
		const f = t - 1.0;
		return f * f * f + 1.0;
	}

	/**
	 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
	 *
	 * https://svelte.dev/docs/svelte-transition#fade
	 * @param {Element} node
	 * @param {import('./public').FadeParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
		const o = +getComputedStyle(node).opacity;
		return {
			delay,
			duration,
			easing,
			css: (t) => `opacity: ${t * o}`
		};
	}

	/**
	 * Slides an element in and out.
	 *
	 * https://svelte.dev/docs/svelte-transition#slide
	 * @param {Element} node
	 * @param {import('./public').SlideParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function slide(node, { delay = 0, duration = 400, easing = cubicOut, axis = 'y' } = {}) {
		const style = getComputedStyle(node);
		const opacity = +style.opacity;
		const primary_property = axis === 'y' ? 'height' : 'width';
		const primary_property_value = parseFloat(style[primary_property]);
		const secondary_properties = axis === 'y' ? ['top', 'bottom'] : ['left', 'right'];
		const capitalized_secondary_properties = secondary_properties.map(
			(e) => `${e[0].toUpperCase()}${e.slice(1)}`
		);
		const padding_start_value = parseFloat(style[`padding${capitalized_secondary_properties[0]}`]);
		const padding_end_value = parseFloat(style[`padding${capitalized_secondary_properties[1]}`]);
		const margin_start_value = parseFloat(style[`margin${capitalized_secondary_properties[0]}`]);
		const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`]);
		const border_width_start_value = parseFloat(
			style[`border${capitalized_secondary_properties[0]}Width`]
		);
		const border_width_end_value = parseFloat(
			style[`border${capitalized_secondary_properties[1]}Width`]
		);
		return {
			delay,
			duration,
			easing,
			css: (t) =>
				'overflow: hidden;' +
				`opacity: ${Math.min(t * 20, 1) * opacity};` +
				`${primary_property}: ${t * primary_property_value}px;` +
				`padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
				`padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
				`margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
				`margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
				`border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
				`border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
		};
	}

	/**
	 * Combines slide & fade transitions into a single transition. For options `easing` this is applied to both transitions,
	 * however if provided `easingSlide` and / or `easingFade` will take precedence. The default easing is linear.
	 *
	 * @param {HTMLElement} node - The transition node.
	 *
	 * @param {object}      [options] - Optional parameters.
	 *
	 * @param {'x' | 'y'}   [options.axis] - The sliding axis.
	 *
	 * @param {number}      [options.delay] - Delay in ms before start of transition.
	 *
	 * @param {number}      [options.duration] - Total transition length in ms.
	 *
	 * @param {import('svelte/transition').EasingFunction}   [options.easing=linear] - The easing function to apply to both
	 *        slide & fade transitions.
	 *
	 * @param {import('svelte/transition').EasingFunction}   [options.easingFade=linear] - The easing function to apply to
	 *        the fade transition.
	 *
	 * @param {import('svelte/transition').EasingFunction}   [options.easingSlide=linear] - The easing function to apply to
	 *        the slide transition.
	 *
	 * @returns {import('svelte/transition').TransitionConfig} Transition config.
	 */
	function slideFade(node, options)
	{
	   const fadeEasing = options.easingFade ?? options.easing ?? identity;
	   const slideEasing = options.easingSlide ?? options.easing ?? identity;

	   const fadeTransition = fade(node);
	   const slideTransition = slide(node, { axis: options.axis });

	   return {
	      delay: options.delay ?? 0,
	      duration: options.duration ?? 500,
	      easing: identity,
	      css: (t) =>
	      {
	         const fadeT = fadeEasing(t);
	         const slideT = slideEasing(t);
	         return `${slideTransition.css(slideT, 1 - slideT)}; ${fadeTransition.css(fadeT, 1 - fadeT)}`;
	      }
	   };
	}

	/* src\components\navigation\HelpPanel.svelte generated by Svelte v4.2.8 */

	function get_each_context$4(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		return child_ctx;
	}

	// (39:6) {#each reflectionData as entry (entry.value)}
	function create_each_block$4(key_1, ctx) {
		let span;
		let svg;
		let use;
		let t0;
		let t1_value = /*entry*/ ctx[11].key + "";
		let t1;
		let t2;

		return {
			key: key_1,
			first: null,
			c() {
				span = element("span");
				svg = svg_element("svg");
				use = svg_element("use");
				t0 = space();
				t1 = text(t1_value);
				t2 = space();
				attr(use, "href", `${/*iconsPrepend*/ ctx[3]}#icon-${/*entry*/ ctx[11].value}`);
				attr(svg, "class", "tsd-kind-icon svelte-1uxeem0");
				attr(svg, "viewBox", "0 0 24 24");
				attr(span, "class", "svelte-1uxeem0");
				this.first = span;
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, svg);
				append(svg, use);
				append(span, t0);
				append(span, t1);
				append(span, t2);
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (49:3) {#if $storeTopLevelNodes > 0}
	function create_if_block_2$1(ctx) {
		let span;

		return {
			c() {
				span = element("span");
				span.innerHTML = `<i class="key svelte-1uxeem0">Alt + E</i>(Nav) open / close all`;
				attr(span, "class", "svelte-1uxeem0");
			},
			m(target, anchor) {
				insert(target, span, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (53:3) {#if hasModulesIndex}
	function create_if_block_1$1(ctx) {
		let span;
		let i;
		let t1;
		let t2;
		let t3;

		return {
			c() {
				span = element("span");
				i = element("i");
				i.textContent = "Alt + M";
				t1 = text("Go to ");
				t2 = text(/*moduleIndexLabel*/ ctx[6]);
				t3 = text(" page");
				attr(i, "class", "key svelte-1uxeem0");
				attr(span, "class", "svelte-1uxeem0");
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, i);
				append(span, t1);
				append(span, t2);
				append(span, t3);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (56:3) {#if $storeTopLevelNodes > 0}
	function create_if_block$6(ctx) {
		let span;

		return {
			c() {
				span = element("span");
				span.innerHTML = `<i class="key svelte-1uxeem0">Alt</i>Press when opening / closing folders to open / close all child folders.`;
				attr(span, "class", "svelte-1uxeem0");
			},
			m(target, anchor) {
				insert(target, span, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	function create_fragment$b(ctx) {
		let div;
		let span0;
		let t1;
		let section;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t2;
		let span1;
		let t4;
		let span2;
		let t7;
		let t8;
		let span3;
		let t11;
		let span4;
		let t14;
		let span5;
		let t17;
		let t18;
		let span6;
		let t21;
		let span7;
		let t24;
		let div_transition;
		let current;
		let each_value = ensure_array_like(/*reflectionData*/ ctx[7]);
		const get_key = ctx => /*entry*/ ctx[11].value;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$4(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
		}

		let if_block0 = /*$storeTopLevelNodes*/ ctx[2] > 0 && create_if_block_2$1();
		let if_block1 = /*hasModulesIndex*/ ctx[0] && create_if_block_1$1(ctx);
		let if_block2 = /*$storeTopLevelNodes*/ ctx[2] > 0 && create_if_block$6();

		return {
			c() {
				div = element("div");
				span0 = element("span");
				span0.textContent = "Reflection Icon Reference:";
				t1 = space();
				section = element("section");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t2 = space();
				span1 = element("span");
				span1.textContent = "Keyboard Shortcuts:";
				t4 = space();
				span2 = element("span");
				span2.innerHTML = `<i class="key svelte-1uxeem0">Alt + C</i>Focus main content`;
				t7 = space();
				if (if_block0) if_block0.c();
				t8 = space();
				span3 = element("span");
				span3.innerHTML = `<i class="key svelte-1uxeem0">Alt + H</i>Open / close help`;
				t11 = space();
				span4 = element("span");
				span4.innerHTML = `<i class="key svelte-1uxeem0">Alt + I</i>Go to home / index page`;
				t14 = space();
				span5 = element("span");
				span5.innerHTML = `<i class="key svelte-1uxeem0">Alt + N</i>(Nav) focus selected`;
				t17 = space();
				if (if_block1) if_block1.c();
				t18 = space();
				span6 = element("span");
				span6.innerHTML = `<i class="key svelte-1uxeem0">Alt + O</i>Focus &quot;On This Page&quot;`;
				t21 = space();
				span7 = element("span");
				span7.innerHTML = `<i class="key svelte-1uxeem0">Alt + S</i>Activate search`;
				t24 = space();
				if (if_block2) if_block2.c();
				attr(span0, "class", "title svelte-1uxeem0");
				attr(section, "class", "reflection-kinds svelte-1uxeem0");
				attr(span1, "class", "title svelte-1uxeem0");
				attr(span2, "class", "svelte-1uxeem0");
				attr(span3, "class", "svelte-1uxeem0");
				attr(span4, "class", "svelte-1uxeem0");
				attr(span5, "class", "svelte-1uxeem0");
				attr(span6, "class", "svelte-1uxeem0");
				attr(span7, "class", "svelte-1uxeem0");
				attr(div, "class", "svelte-1uxeem0");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, span0);
				append(div, t1);
				append(div, section);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(section, null);
					}
				}

				append(div, t2);
				append(div, span1);
				append(div, t4);
				append(div, span2);
				append(div, t7);
				if (if_block0) if_block0.m(div, null);
				append(div, t8);
				append(div, span3);
				append(div, t11);
				append(div, span4);
				append(div, t14);
				append(div, span5);
				append(div, t17);
				if (if_block1) if_block1.m(div, null);
				append(div, t18);
				append(div, span6);
				append(div, t21);
				append(div, span7);
				append(div, t24);
				if (if_block2) if_block2.m(div, null);
				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*reflectionData, iconsPrepend*/ 136) {
					each_value = ensure_array_like(/*reflectionData*/ ctx[7]);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, section, destroy_block, create_each_block$4, null, get_each_context$4);
				}

				if (/*$storeTopLevelNodes*/ ctx[2] > 0) {
					if (if_block0) ; else {
						if_block0 = create_if_block_2$1();
						if_block0.c();
						if_block0.m(div, t8);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*hasModulesIndex*/ ctx[0]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_1$1(ctx);
						if_block1.c();
						if_block1.m(div, t18);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*$storeTopLevelNodes*/ ctx[2] > 0) {
					if (if_block2) ; else {
						if_block2 = create_if_block$6();
						if_block2.c();
						if_block2.m(div, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}
			},
			i(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (!div_transition) div_transition = create_bidirectional_transition(div, /*animateTransition*/ ctx[5], { duration: 100 }, true);
						div_transition.run(1);
					});
				}

				current = true;
			},
			o(local) {
				if (local) {
					if (!div_transition) div_transition = create_bidirectional_transition(div, /*animateTransition*/ ctx[5], { duration: 100 }, false);
					div_transition.run(0);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				if (detaching && div_transition) div_transition.end();
			}
		};
	}

	function instance$b($$self, $$props, $$invalidate) {
		let $storeSettingAnimate;

		let $storeTopLevelNodes,
			$$unsubscribe_storeTopLevelNodes = noop,
			$$subscribe_storeTopLevelNodes = () => ($$unsubscribe_storeTopLevelNodes(), $$unsubscribe_storeTopLevelNodes = subscribe(storeTopLevelNodes, $$value => $$invalidate(2, $storeTopLevelNodes = $$value)), storeTopLevelNodes);

		$$self.$$.on_destroy.push(() => $$unsubscribe_storeTopLevelNodes());
		let { hasModulesIndex = false } = $$props;
		let { moduleIsPackage = false } = $$props;
		let { storeTopLevelNodes = void 0 } = $$props;
		$$subscribe_storeTopLevelNodes();

		/** @type {string} */
		const iconsPrepend = getContext('#iconsPrepend');

		/** @type {object} */
		const ReflectionKind = getContext('#ReflectionKind');

		/** @type {import('svelte/store').Writable<boolean>} */
		const storeSettingAnimate = getContext('#storeSettingAnimate');

		component_subscribe($$self, storeSettingAnimate, value => $$invalidate(9, $storeSettingAnimate = value));
		const animateTransition = $storeSettingAnimate ? slideFade : () => void 0;
		const moduleIndexLabel = moduleIsPackage ? 'package' : 'module';
		const reflectionData = [];

		for (const [key, value] of Object.entries(ReflectionKind)) {
			if (typeof value === 'number') {
				reflectionData.push({ key, value });
			}
		}

		reflectionData.sort((a, b) => a.key.localeCompare(b.key));

		$$self.$$set = $$props => {
			if ('hasModulesIndex' in $$props) $$invalidate(0, hasModulesIndex = $$props.hasModulesIndex);
			if ('moduleIsPackage' in $$props) $$invalidate(8, moduleIsPackage = $$props.moduleIsPackage);
			if ('storeTopLevelNodes' in $$props) $$subscribe_storeTopLevelNodes($$invalidate(1, storeTopLevelNodes = $$props.storeTopLevelNodes));
		};

		return [
			hasModulesIndex,
			storeTopLevelNodes,
			$storeTopLevelNodes,
			iconsPrepend,
			storeSettingAnimate,
			animateTransition,
			moduleIndexLabel,
			reflectionData,
			moduleIsPackage
		];
	}

	class HelpPanel extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$b, create_fragment$b, safe_not_equal, {
				hasModulesIndex: 0,
				moduleIsPackage: 8,
				storeTopLevelNodes: 1
			});
		}
	}

	const HelpPanel$1 = HelpPanel;

	/**
	 * @type {DMTLocalConstants} Defines all the local storage static constants.
	 */
	const localConstants = {
	   dmtThemeAnimate: 'docs-dmt-theme-animate'
	};

	/**
	 * @typedef {object} DMTLocalConstants Local storage constants.
	 *
	 * @property {string} dmtThemeAnimate Stores the current theme animation state.
	 */

	/* src\components\navigation\NavigationBar.svelte generated by Svelte v4.2.8 */

	function create_if_block_2(ctx) {
		let svg0;
		let symbol;
		let path;
		let t0;
		let button0;
		let t1;
		let button1;
		let mounted;
		let dispose;

		return {
			c() {
				svg0 = svg_element("svg");
				symbol = svg_element("symbol");
				path = svg_element("path");
				t0 = space();
				button0 = element("button");
				button0.innerHTML = `<svg class="svelte-1b99m8i"><use xlink:href="#dmt-double-icon-arrow"></use></svg>`;
				t1 = space();
				button1 = element("button");
				button1.innerHTML = `<svg class="flipped-vertical svelte-1b99m8i"><use xlink:href="#dmt-double-icon-arrow"></use></svg>`;
				attr(path, "d", "M517.408 993.568l-0.448 0.256c-18.592-0.032-37.152-7.168-51.328-21.344L51.392 558.24c-27.904-27.904-28.32-74.624 0.224-103.2 28.768-28.768 74.784-28.672 103.2-0.224l362.272 362.272L879.36 454.816c27.904-27.904 74.624-28.32 103.2 0.224 28.768 28.768 28.672 74.784 0.224 103.2l-414.24 414.24c-13.92 13.92-32.512 20.992-51.2 21.056z m0-397.408l-0.448 0.256c-18.592-0.032-37.152-7.168-51.328-21.344l-414.24-414.24c-27.904-27.904-28.32-74.624 0.224-103.2 28.768-28.768 74.784-28.672 103.2-0.224L517.088 419.68 879.36 57.408c27.904-27.904 74.624-28.32 103.2 0.224 28.768 28.768 28.672 74.784 0.224 103.2l-414.24 414.24c-13.92 13.92-32.512 20.992-51.2 21.056z");
				attr(symbol, "id", "dmt-double-icon-arrow");
				attr(symbol, "viewBox", "0 0 1024 1024");
				set_style(svg0, "display", "none");
				attr(svg0, "class", "svelte-1b99m8i");
				attr(button0, "title", 'Open All');
				attr(button0, "class", "svelte-1b99m8i");
				attr(button1, "title", 'Close All');
				attr(button1, "class", "svelte-1b99m8i");
			},
			m(target, anchor) {
				insert(target, svg0, anchor);
				append(svg0, symbol);
				append(symbol, path);
				insert(target, t0, anchor);
				insert(target, button0, anchor);
				insert(target, t1, anchor);
				insert(target, button1, anchor);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[13]),
						listen(button0, "keydown", onKeydownRepeat),
						listen(button0, "pointerdown", stop_propagation(/*pointerdown_handler*/ ctx[12])),
						listen(button1, "click", /*click_handler_1*/ ctx[14]),
						listen(button1, "keydown", onKeydownRepeat),
						listen(button1, "pointerdown", stop_propagation(/*pointerdown_handler_1*/ ctx[11]))
					];

					mounted = true;
				}
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(svg0);
					detach(t0);
					detach(button0);
					detach(t1);
					detach(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (91:3) {#if hasModulesIndex}
	function create_if_block_1(ctx) {
		let a;
		let t;

		return {
			c() {
				a = element("a");
				t = text(/*moduleIndexLabel*/ ctx[8]);
				attr(a, "href", `${/*navigationData*/ ctx[4].baseURL}modules.html`);
				attr(a, "class", "svelte-1b99m8i");
				toggle_class(a, "current", /*navigationData*/ ctx[4].currentPathURL === 'modules.html');
			},
			m(target, anchor) {
				insert(target, a, anchor);
				append(a, t);
			},
			p: noop,
			d(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	// (97:3) {#if $storeHelpPanelOpen}
	function create_if_block$5(ctx) {
		let helppanel;
		let current;

		helppanel = new HelpPanel$1({
				props: {
					hasModulesIndex: /*hasModulesIndex*/ ctx[3],
					moduleIsPackage: /*moduleIsPackage*/ ctx[5],
					storeTopLevelNodes: /*storeTopLevelNodes*/ ctx[7]
				}
			});

		return {
			c() {
				create_component(helppanel.$$.fragment);
			},
			m(target, anchor) {
				mount_component(helppanel, target, anchor);
				current = true;
			},
			p: noop,
			i(local) {
				if (current) return;
				transition_in(helppanel.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(helppanel.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(helppanel, detaching);
			}
		};
	}

	function create_fragment$a(ctx) {
		let section;
		let t0;
		let button;
		let svg;
		let g;
		let path0;
		let path1;
		let t1;
		let t2;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*$storeTopLevelNodes*/ ctx[2] > 0 && create_if_block_2(ctx);
		let if_block1 = /*hasModulesIndex*/ ctx[3] && create_if_block_1(ctx);
		let if_block2 = /*$storeHelpPanelOpen*/ ctx[0] && create_if_block$5(ctx);

		return {
			c() {
				section = element("section");
				if (if_block0) if_block0.c();
				t0 = space();
				button = element("button");
				svg = svg_element("svg");
				g = svg_element("g");
				path0 = svg_element("path");
				path1 = svg_element("path");
				t1 = space();
				if (if_block1) if_block1.c();
				t2 = space();
				if (if_block2) if_block2.c();
				attr(path0, "d", "M502.29,788.199h-47c-33.1,0-60,26.9-60,60v64.9c0,33.1,26.9,60,60,60h47c33.101,0,60-26.9,60-60v-64.9 C562.29,815,535.391,788.199,502.29,788.199z");
				attr(path1, "d", "M170.89,285.8l86.7,10.8c27.5,3.4,53.6-12.4,63.5-38.3c12.5-32.7,29.9-58.5,52.2-77.3c31.601-26.6,70.9-40,117.9-40\r\n                     c48.7,0,87.5,12.8,116.3,38.3c28.8,25.6,43.1,56.2,43.1,92.1c0,25.8-8.1,49.4-24.3,70.8c-10.5,13.6-42.8,42.2-96.7,85.9\r\n                     c-54,43.7-89.899,83.099-107.899,118.099c-18.4,35.801-24.8,75.5-26.4,115.301c-1.399,34.1,25.8,62.5,60,62.5h49\r\n                     c31.2,0,57-23.9,59.8-54.9c2-22.299,5.7-39.199,11.301-50.699c9.399-19.701,33.699-45.701,72.699-78.1\r\n                     C723.59,477.8,772.79,428.4,795.891,392c23-36.3,34.6-74.8,34.6-115.5c0-73.5-31.3-138-94-193.4c-62.6-55.4-147-83.1-253-83.1\r\n                     c-100.8,0-182.1,27.3-244.1,82c-52.8,46.6-84.9,101.8-96.2,165.5C139.69,266.1,152.39,283.5,170.89,285.8z");
				attr(svg, "viewBox", "0 0 973.1 973.1");
				attr(svg, "class", "svelte-1b99m8i");
				attr(button, "title", /*helpTitle*/ ctx[1]);
				attr(button, "class", "svelte-1b99m8i");
				attr(section, "class", "svelte-1b99m8i");
			},
			m(target, anchor) {
				insert(target, section, anchor);
				if (if_block0) if_block0.m(section, null);
				append(section, t0);
				append(section, button);
				append(button, svg);
				append(svg, g);
				append(g, path0);
				append(g, path1);
				append(section, t1);
				if (if_block1) if_block1.m(section, null);
				append(section, t2);
				if (if_block2) if_block2.m(section, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button, "click", /*onClickHelp*/ ctx[9]),
						listen(button, "keydown", onKeydownRepeat)
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (/*$storeTopLevelNodes*/ ctx[2] > 0) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_2(ctx);
						if_block0.c();
						if_block0.m(section, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (!current || dirty & /*helpTitle*/ 2) {
					attr(button, "title", /*helpTitle*/ ctx[1]);
				}

				if (/*hasModulesIndex*/ ctx[3]) if_block1.p(ctx, dirty);

				if (/*$storeHelpPanelOpen*/ ctx[0]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);

						if (dirty & /*$storeHelpPanelOpen*/ 1) {
							transition_in(if_block2, 1);
						}
					} else {
						if_block2 = create_if_block$5(ctx);
						if_block2.c();
						transition_in(if_block2, 1);
						if_block2.m(section, null);
					}
				} else if (if_block2) {
					group_outros();

					transition_out(if_block2, 1, 1, () => {
						if_block2 = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block2);
				current = true;
			},
			o(local) {
				transition_out(if_block2);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(section);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function onKeydownRepeat(event) {
		if (event.repeat) {
			event.stopPropagation();
			event.preventDefault();
		}
	}

	function instance$a($$self, $$props, $$invalidate) {
		let helpTitle;
		let $storeHelpPanelOpen;
		let $storeTopLevelNodes;
		let { dmtComponentData = void 0 } = $$props;
		setContext('#ReflectionKind', dmtComponentData.ReflectionKind);
		setContext('#storeSettingAnimate', dmtComponentData.dmtLocalStorage.getStore(localConstants.dmtThemeAnimate));
		const { hasModulesIndex, navigationData, moduleIsPackage } = dmtComponentData;
		const { storeHelpPanelOpen, storeTopLevelNodes } = navigationData;
		component_subscribe($$self, storeHelpPanelOpen, value => $$invalidate(0, $storeHelpPanelOpen = value));
		component_subscribe($$self, storeTopLevelNodes, value => $$invalidate(2, $storeTopLevelNodes = value));
		const moduleIndexLabel = moduleIsPackage ? 'Package Index' : 'Module Index';

		function onClickHelp() {
			set_store_value(storeHelpPanelOpen, $storeHelpPanelOpen = !get_store_value(storeHelpPanelOpen), $storeHelpPanelOpen);
		}

		function pointerdown_handler_1(event) {
			bubble.call(this, $$self, event);
		}

		function pointerdown_handler(event) {
			bubble.call(this, $$self, event);
		}

		const click_handler = () => navigationData.setStoresAllOpen(true);
		const click_handler_1 = () => navigationData.setStoresAllOpen(false);

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(10, dmtComponentData = $$props.dmtComponentData);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$storeHelpPanelOpen*/ 1) {
				$$invalidate(1, helpTitle = $storeHelpPanelOpen ? 'Close Help' : 'Open Help');
			}
		};

		return [
			$storeHelpPanelOpen,
			helpTitle,
			$storeTopLevelNodes,
			hasModulesIndex,
			navigationData,
			moduleIsPackage,
			storeHelpPanelOpen,
			storeTopLevelNodes,
			moduleIndexLabel,
			onClickHelp,
			dmtComponentData,
			pointerdown_handler_1,
			pointerdown_handler,
			click_handler,
			click_handler_1
		];
	}

	class NavigationBar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$a, create_fragment$a, safe_not_equal, { dmtComponentData: 10 });
		}
	}

	const NavigationBar$1 = NavigationBar;

	/* src\components\navigation\SidebarLinks.svelte generated by Svelte v4.2.8 */

	function get_each_context$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	// (14:0) {#if hasLinks}
	function create_if_block$4(ctx) {
		let section;
		let each_blocks_1 = [];
		let each0_lookup = new Map();
		let t;
		let each_blocks = [];
		let each1_lookup = new Map();
		let each_value_1 = ensure_array_like(Object.keys(/*navigationLinks*/ ctx[1]));
		const get_key = ctx => /*navigationLinks*/ ctx[1][/*key*/ ctx[4]];

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each0_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
		}

		let each_value = ensure_array_like(Object.keys(/*sidebarLinks*/ ctx[0]));
		const get_key_1 = ctx => /*sidebarLinks*/ ctx[0][/*key*/ ctx[4]];

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$3(ctx, each_value, i);
			let key = get_key_1(child_ctx);
			each1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
		}

		return {
			c() {
				section = element("section");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(section, "class", "svelte-820e2");
			},
			m(target, anchor) {
				insert(target, section, anchor);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(section, null);
					}
				}

				append(section, t);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(section, null);
					}
				}
			},
			p(ctx, dirty) {
				if (dirty & /*navigationLinks, Object*/ 2) {
					each_value_1 = ensure_array_like(Object.keys(/*navigationLinks*/ ctx[1]));
					each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, section, destroy_block, create_each_block_1$1, t, get_each_context_1$1);
				}

				if (dirty & /*sidebarLinks, Object*/ 1) {
					each_value = ensure_array_like(Object.keys(/*sidebarLinks*/ ctx[0]));
					each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, section, destroy_block, create_each_block$3, null, get_each_context$3);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(section);
				}

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d();
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};
	}

	// (16:3) {#each Object.keys(navigationLinks) as key (navigationLinks[key])}
	function create_each_block_1$1(key_2, ctx) {
		let a;
		let span;

		return {
			key: key_2,
			first: null,
			c() {
				a = element("a");
				span = element("span");
				span.textContent = `${/*key*/ ctx[4]}`;
				attr(a, "href", `${/*navigationLinks*/ ctx[1][/*key*/ ctx[4]]}`);
				attr(a, "target", "_blank");
				attr(a, "class", "svelte-820e2");
				this.first = a;
			},
			m(target, anchor) {
				insert(target, a, anchor);
				append(a, span);
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	// (19:3) {#each Object.keys(sidebarLinks) as key (sidebarLinks[key])}
	function create_each_block$3(key_2, ctx) {
		let a;
		let span;

		return {
			key: key_2,
			first: null,
			c() {
				a = element("a");
				span = element("span");
				span.textContent = `${/*key*/ ctx[4]}`;
				attr(a, "href", `${/*sidebarLinks*/ ctx[0][/*key*/ ctx[4]]}`);
				attr(a, "target", "_blank");
				attr(a, "class", "svelte-820e2");
				this.first = a;
			},
			m(target, anchor) {
				insert(target, a, anchor);
				append(a, span);
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	function create_fragment$9(ctx) {
		let if_block_anchor;
		let if_block = /*hasLinks*/ ctx[2] && create_if_block$4(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (/*hasLinks*/ ctx[2]) if_block.p(ctx, dirty);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	function instance$9($$self, $$props, $$invalidate) {
		let { dmtComponentData = void 0 } = $$props;

		/** @type {Record<string, string>} */
		const sidebarLinks = dmtComponentData?.sidebarLinks ?? {};

		/** @type {Record<string, string>} */
		const navigationLinks = dmtComponentData?.navigationLinks ?? {};

		const hasLinks = Object.keys(sidebarLinks).length + Object.keys(navigationLinks).length > 0;

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(3, dmtComponentData = $$props.dmtComponentData);
		};

		return [sidebarLinks, navigationLinks, hasLinks, dmtComponentData];
	}

	class SidebarLinks extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$9, create_fragment$9, safe_not_equal, { dmtComponentData: 3 });
		}
	}

	const SidebarLinks$1 = SidebarLinks;

	/**
	 * Provides reactive management of the default theme details elements for animation controlled by local storage state.
	 */
	class DetailsAnimation
	{
	   #actionUpdateFn = [];

	   constructor()
	   {
	      const detailElList = /** @type {NodeListOf<HTMLDetailsElement>} */ document.querySelectorAll(
	       'details.tsd-index-accordion');

	      // Add the toggleDetails actions to all default theme detail elements storing the update action.
	      for (const detailEl of detailElList)
	      {
	         this.#actionUpdateFn.push(toggleDetails(detailEl, { store: writable(detailEl.open) }).update);
	      }
	   }

	   /**
	    * Enables / disables animation for the default theme details elements.
	    *
	    * @param {boolean}  animate - Current animation state.
	    */
	   setEnabled(animate)
	   {
	      const detailElList = /** @type {NodeListOf<HTMLDetailsElement>} */ document.querySelectorAll(
	       'details.tsd-index-accordion');

	      for (const detailEl of detailElList)
	      {
	         // Add class to provide transition for svg chevron. This is manually added to avoid transform on page load.
	         const svgEl = detailEl.querySelector('summary svg');
	         if (svgEl) { svgEl.classList[animate ? 'add' : 'remove']('dmt-summary-svg'); }
	      }

	      // Update the toggleDetails actions
	      for (const actionUpdate of this.#actionUpdateFn) { actionUpdate({ animate }); }
	   }
	}

	/* src\components\navigation\Navigation.svelte generated by Svelte v4.2.8 */

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		return child_ctx;
	}

	// (74:6) {:else}
	function create_else_block(ctx) {
		let entry_1;
		let current;

		entry_1 = new Entry$1({
				props: {
					entry: /*entry*/ ctx[11],
					indentIcon,
					removeIcon: !/*navModuleIcon*/ ctx[3] && /*entry*/ ctx[11]?.kind === 2
				}
			});

		return {
			c() {
				create_component(entry_1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(entry_1, target, anchor);
				current = true;
			},
			p: noop,
			i(local) {
				if (current) return;
				transition_in(entry_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(entry_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(entry_1, detaching);
			}
		};
	}

	// (72:6) {#if Array.isArray(entry.children)}
	function create_if_block$3(ctx) {
		let folder;
		let current;
		folder = new Folder$1({ props: { entry: /*entry*/ ctx[11] } });

		return {
			c() {
				create_component(folder.$$.fragment);
			},
			m(target, anchor) {
				mount_component(folder, target, anchor);
				current = true;
			},
			p: noop,
			i(local) {
				if (current) return;
				transition_in(folder.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(folder.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(folder, detaching);
			}
		};
	}

	// (71:3) {#each navigationData.index as entry (entry.path)}
	function create_each_block$2(key_1, ctx) {
		let first;
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$3, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (Array.isArray(/*entry*/ ctx[11].children)) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				if_block.c();
				if_block_anchor = empty();
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if_block.p(ctx, dirty);
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(first);
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	function create_fragment$8(ctx) {
		let sidebarlinks;
		let t0;
		let navigationbar;
		let t1;
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let mounted;
		let dispose;

		sidebarlinks = new SidebarLinks$1({
				props: {
					dmtComponentData: /*dmtComponentData*/ ctx[0]
				}
			});

		navigationbar = new NavigationBar$1({
				props: {
					dmtComponentData: /*dmtComponentData*/ ctx[0]
				}
			});

		let each_value = ensure_array_like(/*navigationData*/ ctx[2].index);
		const get_key = ctx => /*entry*/ ctx[11].path;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$2(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
		}

		return {
			c() {
				create_component(sidebarlinks.$$.fragment);
				t0 = space();
				create_component(navigationbar.$$.fragment);
				t1 = space();
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "dmt-navigation-content svelte-ru8laz");
				attr(div, "tabindex", "-1");
			},
			m(target, anchor) {
				mount_component(sidebarlinks, target, anchor);
				insert(target, t0, anchor);
				mount_component(navigationbar, target, anchor);
				insert(target, t1, anchor);
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}

				/*div_binding*/ ctx[8](div);
				current = true;

				if (!mounted) {
					dispose = [
						listen(window, "hashchange", /*navigationData*/ ctx[2].state.onHashchange),
						listen(div, "keydown", onKeydown, true)
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				const sidebarlinks_changes = {};
				if (dirty & /*dmtComponentData*/ 1) sidebarlinks_changes.dmtComponentData = /*dmtComponentData*/ ctx[0];
				sidebarlinks.$set(sidebarlinks_changes);
				const navigationbar_changes = {};
				if (dirty & /*dmtComponentData*/ 1) navigationbar_changes.dmtComponentData = /*dmtComponentData*/ ctx[0];
				navigationbar.$set(navigationbar_changes);

				if (dirty & /*navigationData, Array, indentIcon, navModuleIcon*/ 12) {
					each_value = ensure_array_like(/*navigationData*/ ctx[2].index);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(sidebarlinks.$$.fragment, local);
				transition_in(navigationbar.$$.fragment, local);

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				transition_out(sidebarlinks.$$.fragment, local);
				transition_out(navigationbar.$$.fragment, local);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(t1);
					detach(div);
				}

				destroy_component(sidebarlinks, detaching);
				destroy_component(navigationbar, detaching);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				/*div_binding*/ ctx[8](null);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	const indentIcon = 'indent-no-icon';

	/**
	 * Prevents the space key from scrolling the tree view; for Chrome.
	 *
	 * @param {KeyboardEvent} event - Keyboard Event.
	 */
	function onKeydown(event) {
		if (event.code === 'Space') {
			event.preventDefault();
		}
	}

	function instance$8($$self, $$props, $$invalidate) {
		let $storeCurrentPathURL;
		let $storeSettingsAnimate;
		let { dmtComponentData = void 0 } = $$props;
		const { iconsPrepend, navigationData, navModuleIcon } = dmtComponentData;
		const detailsAnimation = new DetailsAnimation();
		const storeSettingsAnimate = dmtComponentData.dmtLocalStorage.getStore(localConstants.dmtThemeAnimate);
		component_subscribe($$self, storeSettingsAnimate, value => $$invalidate(7, $storeSettingsAnimate = value));
		setContext('#iconsPrepend', iconsPrepend);
		setContext('#navModuleIcon', navModuleIcon);
		setContext('#navigationData', navigationData);
		setContext('#storeSettingAnimate', storeSettingsAnimate);
		const { storeCurrentPathURL } = navigationData;
		component_subscribe($$self, storeCurrentPathURL, value => $$invalidate(6, $storeCurrentPathURL = value));
		let navigationEl;

		function div_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				navigationEl = $$value;
				$$invalidate(1, navigationEl);
			});
		}

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(0, dmtComponentData = $$props.dmtComponentData);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$storeSettingsAnimate*/ 128) {
				// Handle setting animation state for default theme detail elements.
				detailsAnimation.setEnabled($storeSettingsAnimate);
			}

			if ($$self.$$.dirty & /*$storeCurrentPathURL, navigationEl*/ 66) {
				if ($storeCurrentPathURL) {
					// Wait for the next animation frame as this will ensure multiple levels of tree nodes opening.
					nextAnimationFrame().then(() => {
						const targetEl = navigationEl.querySelector(`a[href*="${navigationData.currentPathURL}"]`);

						if (targetEl) {
							targetEl.scrollIntoView({ block: 'center', inline: 'center' });
						}
					});
				}
			}
		};

		return [
			dmtComponentData,
			navigationEl,
			navigationData,
			navModuleIcon,
			storeSettingsAnimate,
			storeCurrentPathURL,
			$storeCurrentPathURL,
			$storeSettingsAnimate,
			div_binding
		];
	}

	class Navigation extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { dmtComponentData: 0 });
		}

		get dmtComponentData() {
			return this.$$.ctx[0];
		}

		set dmtComponentData(dmtComponentData) {
			this.$$set({ dmtComponentData });
			flush();
		}
	}

	const Navigation$1 = Navigation;

	/**
	 * Provides the ability to walk the navigation index and manage state for initial opened state for entries and ensuring
	 * opened state when URL hash changes occur.
	 */
	class NavigationState
	{
	   /** @type {import('./NavigationData').NavigationData} */
	   #navData;

	   #onHashchangeBound;

	   /**
	    * @param {import('./NavigationData').NavigationData} navData - Navigation data.
	    */
	   constructor(navData)
	   {
	      this.#navData = navData;
	      this.#onHashchangeBound = this.#onHashchange.bind(this);

	      this.#setInitialState();
	   }

	   /**
	    * @returns {Function} Window hashchange listener.
	    */
	   get onHashchange() { return this.#onHashchangeBound; }

	   /**
	    * Finds the child nodes that match the given path URL by a depth first search and recursively finds any associated
	    * `storageKey` associated with parent tree nodes and sets the session state to open.
	    *
	    * @param {string}   pathURL - The path URL to locate.
	    *
	    * @param {object}   [opts] - Optional parameters.
	    *
	    * @param {boolean}  [opts.setCurrent=true] - If the path is found in the index set it to the current path.
	    *
	    * @returns {boolean} If entry for path URL is found and operation applied.
	    */
	   ensureCurrentPath(pathURL, { setCurrent = true } = {})
	   {
	      // Sets `opened` for all entry tree nodes from the path URL given.
	      const operation = (entry) =>
	      {
	         if (entry.storageKey) { this.#navData.dmtSessionStorage.setItem(entry.storageKey, true); }
	      };

	      const result = this.#searchTree(pathURL, operation);

	      if (result && setCurrent) { this.#navData.setCurrentPathURL(pathURL); }

	      return result;
	   }

	   /**
	    * Sets all session storage stores from the given entry. This supports `Alt-<Click>` action to open / close all
	    * child folders.
	    *
	    * @param {import('./types').DMTNavigationElement} fromEntry - The entry to start traversing tree.
	    *
	    * @param {boolean} state - New state.
	    */
	   setChildFolderState(fromEntry, state)
	   {
	      const operation = (entry) =>
	      {
	         if (entry.storageKey) { this.#navData.dmtSessionStorage.setItem(entry.storageKey, state); }
	      };

	      this.#walkTreeFrom(operation, fromEntry);
	   }


	   // Internal implementation ----------------------------------------------------------------------------------------

	   /**
	    * Create custom click handlers for all main content anchors that have a hash fragment. `hashAnchorClick` will
	    * ensure that the Navigation entry is visible when clicked even if the main URL hash fragment doesn't change.
	    */
	   #hashAnchorLinks()
	   {
	      const baseURL = this.#navData.baseURL;
	      const navigationState = this;

	      /**
	       * Handle any clicks on content anchors with a hash ensuring that the clicked upon anchor is always visible in the
	       * navigation tree.
	       *
	       * @param {PointerEvent}   event -
	       */
	      function hashAnchorClick(event)
	      {
	         event.preventDefault(); // Prevent the default anchor click behavior.

	         const fullURLNoHash = globalThis.location.href.split('#')[0];
	         const anchorURLNoHash = this.href.split('#')[0];

	         // If the main URLs or hash differ then set the window location. The `onHashchange` function will trigger.
	         if (fullURLNoHash !== anchorURLNoHash || globalThis.location.hash !== this.hash)
	         {
	            globalThis.location.href = this.href;
	            return;
	         }

	         // Otherwise a link is clicked and the URL / hash reference is the same as the current page. Ensure that
	         // the navigation tree shows the current entry.

	         const pathURL = this.href.replace(baseURL, '');

	         if (!navigationState.ensureCurrentPath(pathURL) && pathURL.includes('#'))
	         {
	            // Handle the case where the hash fragment is not in the navigation index. Attempt to ensure current path
	            // without the hash fragment.
	            const match = pathURL.split('#');

	            // No hash URL
	            if (match[0]) { navigationState.ensureCurrentPath(match[0]); }

	            // Manually scroll to hash fragment.
	            navigationState.#scrollContentToHash(match[1]);
	         }
	      }

	      // Find all anchor links in the main content body and page navigation.
	      const hashAnchors = document.querySelectorAll(
	       'div.col-content a[href*="#"], details.tsd-page-navigation a[href*="#"]');

	      // Add custom hash anchor click handling.
	      for (const anchorEl of hashAnchors) { anchorEl.addEventListener('click', hashAnchorClick); }
	   }

	   /**
	    * Finds the child nodes that match the given path URL by a depth first search and sets the entries session storage
	    * key to true / opened for all entry tree nodes from the path URL given. This overrides any stored values from
	    * session storage on initial render ensuring that the current entry is always visible.
	    *
	    * @param {string}   pathURL - The path URL to locate.
	    *
	    * @returns {boolean} If entry for path URL is found and operation applied.
	    */
	   #initializeCurrentPath(pathURL)
	   {
	      // Sets entry session storage to true / opened for all entry tree nodes from the path URL given.
	      const operation = (entry) =>
	      {
	         if (entry.storageKey) { this.#navData.dmtSessionStorage.setItem(entry.storageKey, true); }
	      };

	      return this.#searchTree(pathURL, operation);
	   }

	   /**
	    * Walks the navigation index tree generating session storage / `storageKey` in all tree nodes.
	    */
	   #initializeTree()
	   {
	      const dmtSessionStorage = this.#navData.dmtSessionStorage;
	      const storagePrepend = this.#navData.storagePrepend;

	      let topLevelNodes = 0;

	      const operation = (entry, parentEntry) =>
	      {
	         if (!parentEntry) { topLevelNodes++; }

	         // Set storage key to DMTNavigationEntry.
	         const parentPath = parentEntry ? parentEntry.path ?? parentEntry.text : '';
	         entry.storageKey = `${storagePrepend}-nav-${entry.path ?? `${parentPath}-${entry.text}`}`;

	         // Pre-create the session storage stores as TJSSvgFolder doesn't render hidden child content. This allows
	         // the `NavigationBar` component access to all stores immediately.
	         dmtSessionStorage.getStore(entry.storageKey, false);
	      };

	      this.#walkTree(operation);

	      this.#navData.storeTopLevelNodes.set(topLevelNodes);
	   }

	   /**
	    * Updates the session storage state opening all tree nodes to the new URL path. This is added as a listener for
	    * `hashchange` on `window`.
	    *
	    * @param {HashChangeEvent}   event - A HashChange event.
	    */
	   async #onHashchange(event)
	   {
	      const newPathURL = event.newURL.replace(this.#navData.baseURL, '');

	      // Ensure any tree nodes are open for `newURLPath`.
	      if (!this.ensureCurrentPath(newPathURL) && newPathURL.includes('#'))
	      {
	         // Handle the case where the hash fragment is not in the navigation index. Attempt to ensure current path
	         // without the hash fragment.
	         const noHashURL = newPathURL.split('#')[0];
	         if (noHashURL) { this.ensureCurrentPath(noHashURL); }
	      }
	   }

	   /**
	    * Scrolls the current page to the given hash fragment.
	    * TODO: This is a workaround attempt for a Chromium / Chrome bug where hash fragments are not properly scrolled to.
	    * Hash fragment scrolling into view works fine w/ Firefox.
	    *
	    * I have deemed it currently not worth having a workaround in place, but left the workaround attempt for a later
	    * review.
	    *
	    * See:
	    * https://bugs.chromium.org/p/chromium/issues/detail?id=1417660
	    * https://bugs.chromium.org/p/chromium/issues/detail?id=833617
	    *
	    * @param {string}   hashFragment - Target hash fragment.
	    */
	   #scrollContentToHash(hashFragment)
	   {
	      // if (typeof hashFragment !== 'string') { return; }
	      //
	      // nextAnimationFrame().then(() =>
	      // {
	      //    const targetEl = document.querySelector(`div.col-content a[href*="#${hashFragment}"]`);
	      //    const contentEl = document.querySelector('div.container.container-main');
	      //
	      //    if (targetEl && contentEl)
	      //    {
	      //       contentEl.focus();
	      //       contentEl.scrollTo({
	      //          top: targetEl.getBoundingClientRect().top - 60,
	      //          behavior: 'instant'
	      //       });
	      //    }
	      // });
	   }

	   /**
	    * Helper function to recursively search for the path and perform the operation given for each tree node.
	    *
	    * @param {import('./types').DMTNavigationElement} entry - Current NavigationElement.
	    *
	    * @param {string}   pathURL - The path URL to locate.
	    *
	    * @param {TreeOperation} operation - Tree entry operation to apply.
	    *
	    * @returns {boolean} Whether the path URL matched an entry in this branch.
	    */
	   #searchPath(entry, pathURL, operation)
	   {
	      // If the path matches, return true to indicate the path has been found.
	      if (entry.path === pathURL) { return true; }

	      // If the entry has children, continue the search recursively.
	      if (Array.isArray(entry.children))
	      {
	         for (const child of entry.children)
	         {
	            const found = this.#searchPath(child, pathURL, operation);
	            if (found)
	            {
	               operation(entry);
	               return true;
	            }
	         }
	      }

	      // If the path has not been found in this branch, return false.
	      return false;
	   }

	   /**
	    * Searches the navigation index for the given path URL and performs the given operation on each tree node from the
	    * path if found.
	    *
	    * @param {string}   pathURL - The path URL to locate.
	    *
	    * @param {TreeOperation} operation - Tree entry operation to apply.
	    *
	    * @returns {boolean} If the path is found and operation is applied.
	    */
	   #searchTree(pathURL, operation)
	   {
	      if (!this.#navData.index?.length) { return false; }

	      // Scan all top level entries first.
	      for (const entry of this.#navData.index)
	      {
	         if (Array.isArray(entry.children)) { continue; }

	         // If the path is found at the top level do nothing and return early.
	         if (entry?.path === pathURL) { return true; }
	      }

	      // Depth first search for path setting a new variable `opened` for all leaves up to path entry.
	      for (const entry of this.#navData.index)
	      {
	         if (!Array.isArray(entry.children)) { continue; }

	         if (this.#searchPath(entry, pathURL, operation)) { return true; }
	      }

	      return false;
	   }

	   /**
	    * Handles setting the initial open state and scrolling the main content div to any hash fragment.
	    */
	   #setInitialState()
	   {
	      this.#initializeTree();

	      const pathURL = this.#navData.initialPathURL;

	      // Attempt to set initial current path; there may be a hash fragment.
	      const initialResult = this.#initializeCurrentPath(pathURL);

	      // Handle the case of a hash fragment.
	      if (pathURL.includes('#'))
	      {
	         const match = pathURL.split('#');

	         // Try setting initial result again with the path URL without the hash fragment.
	         if (!initialResult)
	         {
	            const noHashURL = match[0];
	            if (noHashURL && this.#initializeCurrentPath(noHashURL)) { this.#navData.setCurrentPathURL(noHashURL); }
	         }

	         // Chrome for whatever reason doesn't automatically scroll to the hash fragment, so manually do it.
	         // Note: Firefox does without manual scrolling.
	         this.#scrollContentToHash(match[1]);
	      }

	      // Modify all content links with hash fragments.
	      this.#hashAnchorLinks();
	   }

	   /**
	    * Walks the navigation index / tree for each path recursively.
	    *
	    * @param {import('./types').DMTNavigationElement} entry - The current entry.
	    *
	    * @param {import('./types').DMTNavigationElement} parentEntry - The parent entry.
	    *
	    * @param {TreeOperation}  operation - Tree entry operation to apply.
	    */
	   #walkPath(entry, parentEntry, operation)
	   {
	      // If the entry has children, continue the search recursively.
	      if (Array.isArray(entry.children))
	      {
	         for (const child of entry.children)
	         {
	            if (!Array.isArray(child.children)) { continue; }

	            this.#walkPath(child, entry, operation);
	         }
	      }

	      operation(entry, parentEntry);
	   }

	   /**
	    * Recursively walks the navigation index / tree for just tree nodes invoking the given operation.
	    *
	    * @param {TreeOperation}  operation - Tree entry operation to apply.
	    */
	   #walkTree(operation)
	   {
	      // Depth first search for path setting a new variable `opened` for all leaves up to path entry.
	      for (const entry of this.#navData.index)
	      {
	         if (!Array.isArray(entry.children)) { continue; }

	         this.#walkPath(entry, void 0, operation);
	      }
	   }

	   /**
	    * Recursively walks the navigation index / tree for just tree nodes invoking the given operation from the given
	    * `entry`.
	    *
	    * @param {TreeOperation}  operation - Tree entry operation to apply.
	    *
	    * @param {import('./types').DMTNavigationElement} entry - The current entry.
	    */
	   #walkTreeFrom(operation, entry)
	   {
	      this.#walkPath(entry, void 0, operation);
	   }
	}

	/**
	 * @typedef {((
	 *    entry: import('./types').DMTNavigationElement,
	 *    parentEntry?: import('./types').DMTNavigationElement) => void
	 * )} TreeOperation A function to invoke for tree nodes when walking the tree.
	 */

	/**
	 * @implements {import('./types').INavigationData}
	 */
	class NavigationData
	{
	   /**
	    * The relative path prepend for all entry path links.
	    *
	    * @type {string}
	    */
	   basePath;

	   /**
	    * The documentation base URL.
	    *
	    * @type {string}
	    */
	   baseURL;

	   /**
	    * The current entry path URL.
	    *
	    * @type {string}
	    */
	   currentPathURL;

	   /**
	    * The current path URL store.
	    *
	    * @type {import('svelte/store').Writable<string>}
	    */
	   storeCurrentPathURL;

	   /**
	    * The navigation session storage store manager.
	    *
	    * @type {import('#runtime/svelte/store/web-storage').TJSSessionStorage}
	    */
	   dmtSessionStorage;

	   /**
	    * The navigation index.
	    *
	    * @type {import('./types').DMTNavigationElement[]}
	    */
	   index;

	   /**
	    * The initial path URL.
	    *
	    * @type {string}
	    */
	   initialPathURL;

	   /**
	    * Navigation state control.
	    *
	    * @type {import('./NavigationState').NavigationState}
	    */
	   state;

	   /**
	    * @type {string}
	    */
	   storagePrepend;

	   /**
	    * Whether the help panel is open / closed.
	    *
	    * @type {import('svelte/store').Writable<boolean>}
	    */
	   storeHelpPanelOpen = writable(false);

	   /**
	    * A derived store with the open / close state of all session stores.
	    *
	    * @type {import('svelte/store').Readable<boolean>}
	    */
	   storeSessionAllOpen;

	   /**
	    * Indicates the count of top level nodes if there are entries with children / tree nodes present.
	    *
	    * @type {import('svelte/store').Writable<number>}
	    */
	   storeTopLevelNodes = writable(0);

	   /**
	    * @param {DMTComponentData}  dmtComponentData - Global component data.
	    */
	   constructor(dmtComponentData)
	   {
	      this.basePath = dmtComponentData.basePath;
	      this.baseURL = dmtComponentData.baseURL;
	      this.initialPathURL = dmtComponentData.initialPathURL;
	      this.index = dmtComponentData.navigationIndex;

	      // Retrieve the storage prepend string from global DMT options or use a default key.
	      this.storagePrepend = dmtComponentData.storagePrepend ?? 'docs-unnamed';

	      this.dmtSessionStorage = new TJSSessionStorage();

	      this.currentPathURL = this.initialPathURL;
	      this.storeCurrentPathURL = writable(this.initialPathURL);

	      this.state = new NavigationState(this);

	      this.#createDerivedStores();
	   }

	   /**
	    * Creates derived stores after the navigation tree / index state has been initialized.
	    */
	   #createDerivedStores()
	   {
	      // Create a derived store from all session storage stores; on any update reduce all values and set state
	      // to whether all folders are opened or not.
	      this.storeSessionAllOpen = derived([...this.dmtSessionStorage.stores()],
	       (stores, set) => set(!!stores.reduce((previous, current) => previous & current, true)));
	   }

	   /**
	    * Closes or opens all navigation folders / session store state.
	    *
	    * @param {boolean}  state - New open / close state.
	    */
	   setStoresAllOpen(state)
	   {
	      for (const store of this.dmtSessionStorage.stores()) { store.set(state); }
	   }

	   /**
	    * Sets the current path URL local data and store.
	    *
	    * @param {string}   pathURL - New current path URL.
	    */
	   setCurrentPathURL(pathURL)
	   {
	      this.currentPathURL = pathURL;
	      this.storeCurrentPathURL.set(pathURL);
	   }
	}

	/* src\components\settings\LabeledCheckbox.svelte generated by Svelte v4.2.8 */

	function create_fragment$7(ctx) {
		let label_1;
		let input;
		let t0;
		let svg;
		let rect;
		let path;
		let t1;
		let span;
		let t2;
		let mounted;
		let dispose;

		return {
			c() {
				label_1 = element("label");
				input = element("input");
				t0 = space();
				svg = svg_element("svg");
				rect = svg_element("rect");
				path = svg_element("path");
				t1 = space();
				span = element("span");
				t2 = text(/*label*/ ctx[1]);
				attr(input, "type", "checkbox");
				attr(rect, "class", "tsd-checkbox-background");
				attr(rect, "width", "30");
				attr(rect, "height", "30");
				attr(rect, "x", "1");
				attr(rect, "y", "1");
				attr(rect, "rx", "6");
				attr(rect, "fill", "none");
				attr(path, "class", "tsd-checkbox-checkmark");
				attr(path, "d", "M8.35422 16.8214L13.2143 21.75L24.6458 10.25");
				attr(path, "stroke", "none");
				attr(path, "stroke-width", "3.5");
				attr(path, "stroke-linejoin", "round");
				attr(path, "fill", "none");
				attr(svg, "width", "32");
				attr(svg, "height", "32");
				attr(svg, "viewBox", "0 0 32 32");
				attr(svg, "aria-hidden", "true");
				attr(label_1, "class", "tsd-filter-input");
			},
			m(target, anchor) {
				insert(target, label_1, anchor);
				append(label_1, input);
				input.checked = /*$store*/ ctx[2];
				append(label_1, t0);
				append(label_1, svg);
				append(svg, rect);
				append(svg, path);
				append(label_1, t1);
				append(label_1, span);
				append(span, t2);

				if (!mounted) {
					dispose = listen(input, "change", /*input_change_handler*/ ctx[3]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*$store*/ 4) {
					input.checked = /*$store*/ ctx[2];
				}

				if (dirty & /*label*/ 2) set_data(t2, /*label*/ ctx[1]);
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(label_1);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		let $store,
			$$unsubscribe_store = noop,
			$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(2, $store = $$value)), store);

		$$self.$$.on_destroy.push(() => $$unsubscribe_store());
		let { store = void 0 } = $$props;
		$$subscribe_store();
		let { label = void 0 } = $$props;

		function input_change_handler() {
			$store = this.checked;
			store.set($store);
		}

		$$self.$$set = $$props => {
			if ('store' in $$props) $$subscribe_store($$invalidate(0, store = $$props.store));
			if ('label' in $$props) $$invalidate(1, label = $$props.label);
		};

		return [store, label, $store, input_change_handler];
	}

	class LabeledCheckbox extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$7, create_fragment$7, safe_not_equal, { store: 0, label: 1 });
		}
	}

	const LabeledCheckbox$1 = LabeledCheckbox;

	/* src\components\settings\DMTSettings.svelte generated by Svelte v4.2.8 */

	function create_fragment$6(ctx) {
		let section;
		let labeledcheckbox;
		let current;

		labeledcheckbox = new LabeledCheckbox$1({
				props: {
					store: /*storeAnimate*/ ctx[0],
					label: 'Animation'
				}
			});

		return {
			c() {
				section = element("section");
				create_component(labeledcheckbox.$$.fragment);
				attr(section, "class", "svelte-20evnz");
			},
			m(target, anchor) {
				insert(target, section, anchor);
				mount_component(labeledcheckbox, section, null);
				current = true;
			},
			p: noop,
			i(local) {
				if (current) return;
				transition_in(labeledcheckbox.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(labeledcheckbox.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(section);
				}

				destroy_component(labeledcheckbox);
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { dmtComponentData = void 0 } = $$props;
		const storeAnimate = dmtComponentData.dmtLocalStorage.getStore(localConstants.dmtThemeAnimate, !A11yHelper.prefersReducedMotion);

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(1, dmtComponentData = $$props.dmtComponentData);
		};

		return [storeAnimate, dmtComponentData];
	}

	class DMTSettings extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$6, create_fragment$6, safe_not_equal, { dmtComponentData: 1 });
		}
	}

	const DMTSettings$1 = DMTSettings;

	/* src\components\toolbar\IconLinks.svelte generated by Svelte v4.2.8 */

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	// (12:3) {#each linksIcon as entry (entry.url)}
	function create_each_block_1(key_1, ctx) {
		let a;
		let img;
		let img_src_value;

		return {
			key: key_1,
			first: null,
			c() {
				a = element("a");
				img = element("img");

				if (!src_url_equal(img.src, img_src_value = typeof /*entry*/ ctx[4].dmtPath === 'string'
				? `${/*dmtURL*/ ctx[0]}${/*entry*/ ctx[4].dmtPath}`
				: /*entry*/ ctx[4].iconURL)) attr(img, "src", img_src_value);

				attr(img, "alt", /*entry*/ ctx[4].title);
				attr(img, "class", "svelte-1iuo1zb");
				attr(a, "href", /*entry*/ ctx[4].url);
				attr(a, "target", "_blank");
				attr(a, "title", /*entry*/ ctx[4].title);
				attr(a, "class", "svelte-1iuo1zb");
				this.first = a;
			},
			m(target, anchor) {
				insert(target, a, anchor);
				append(a, img);
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	// (18:3) {#each linksService as entry (entry.url)}
	function create_each_block$1(key_1, ctx) {
		let a;
		let img;
		let img_src_value;
		let t;

		return {
			key: key_1,
			first: null,
			c() {
				a = element("a");
				img = element("img");
				t = space();
				if (!src_url_equal(img.src, img_src_value = `${/*dmtURL*/ ctx[0]}${/*entry*/ ctx[4].dmtPath}`)) attr(img, "src", img_src_value);
				attr(img, "alt", /*entry*/ ctx[4].title);
				attr(img, "class", "svelte-1iuo1zb");
				attr(a, "href", /*entry*/ ctx[4].url);
				attr(a, "target", "_blank");
				attr(a, "title", /*entry*/ ctx[4].title);
				attr(a, "class", "svelte-1iuo1zb");
				this.first = a;
			},
			m(target, anchor) {
				insert(target, a, anchor);
				append(a, img);
				append(a, t);
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	function create_fragment$5(ctx) {
		let section;
		let each_blocks_1 = [];
		let each0_lookup = new Map();
		let t;
		let each_blocks = [];
		let each1_lookup = new Map();
		let each_value_1 = ensure_array_like(/*linksIcon*/ ctx[1]);
		const get_key = ctx => /*entry*/ ctx[4].url;

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
		}

		let each_value = ensure_array_like(/*linksService*/ ctx[2]);
		const get_key_1 = ctx => /*entry*/ ctx[4].url;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key_1(child_ctx);
			each1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		return {
			c() {
				section = element("section");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(section, "class", "svelte-1iuo1zb");
			},
			m(target, anchor) {
				insert(target, section, anchor);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(section, null);
					}
				}

				append(section, t);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(section, null);
					}
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*linksIcon, dmtURL*/ 3) {
					each_value_1 = ensure_array_like(/*linksIcon*/ ctx[1]);
					each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, section, destroy_block, create_each_block_1, t, get_each_context_1);
				}

				if (dirty & /*linksService, dmtURL*/ 5) {
					each_value = ensure_array_like(/*linksService*/ ctx[2]);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, section, destroy_block, create_each_block$1, null, get_each_context$1);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(section);
				}

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d();
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { dmtComponentData = void 0 } = $$props;
		const { dmtURL } = dmtComponentData;
		const linksIcon = dmtComponentData?.linksIcon ?? [];
		const linksService = dmtComponentData?.linksService ?? [];

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(3, dmtComponentData = $$props.dmtComponentData);
		};

		return [dmtURL, linksIcon, linksService, dmtComponentData];
	}

	class IconLinks extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { dmtComponentData: 3 });
		}
	}

	const IconLinks$1 = IconLinks;

	/* src\components\toolbar\Toolbar.svelte generated by Svelte v4.2.8 */

	function create_fragment$4(ctx) {
		let iconlinks;
		let current;

		iconlinks = new IconLinks$1({
				props: {
					dmtComponentData: /*dmtComponentData*/ ctx[0]
				}
			});

		return {
			c() {
				create_component(iconlinks.$$.fragment);
			},
			m(target, anchor) {
				mount_component(iconlinks, target, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				const iconlinks_changes = {};
				if (dirty & /*dmtComponentData*/ 1) iconlinks_changes.dmtComponentData = /*dmtComponentData*/ ctx[0];
				iconlinks.$set(iconlinks_changes);
			},
			i(local) {
				if (current) return;
				transition_in(iconlinks.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(iconlinks.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(iconlinks, detaching);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { dmtComponentData = void 0 } = $$props;

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(0, dmtComponentData = $$props.dmtComponentData);
		};

		return [dmtComponentData];
	}

	class Toolbar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$4, safe_not_equal, { dmtComponentData: 0 });
		}
	}

	const Toolbar$1 = Toolbar;

	/* src\components\search-main\SearchButton.svelte generated by Svelte v4.2.8 */

	function create_fragment$3(ctx) {
		let button;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				button.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M15.7824 13.833L12.6666 10.7177C12.5259 10.5771 12.3353 10.499 12.1353 10.499H11.6259C12.4884 9.39596 13.001 8.00859 13.001 6.49937C13.001 2.90909 10.0914 0 6.50048 0C2.90959 0 0 2.90909 0 6.49937C0 10.0896 2.90959 12.9987 6.50048 12.9987C8.00996 12.9987 9.39756 12.4863 10.5008 11.6239V12.1332C10.5008 12.3332 10.5789 12.5238 10.7195 12.6644L13.8354 15.7797C14.1292 16.0734 14.6042 16.0734 14.8948 15.7797L15.7793 14.8954C16.0731 14.6017 16.0731 14.1267 15.7824 13.833ZM6.50048 10.499C4.29094 10.499 2.50018 8.71165 2.50018 6.49937C2.50018 4.29021 4.28781 2.49976 6.50048 2.49976C8.71001 2.49976 10.5008 4.28708 10.5008 6.49937C10.5008 8.70852 8.71314 10.499 6.50048 10.499Z" fill="var(--color-text)"></path></svg>`;
				attr(button, "class", "svelte-10arjs8");
			},
			m(target, anchor) {
				insert(target, button, anchor);

				if (!mounted) {
					dispose = [
						listen(button, "click", /*click_handler*/ ctx[3]),
						listen(button, "pointerdown", stop_propagation(/*pointerdown_handler*/ ctx[2]))
					];

					mounted = true;
				}
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let $storeVisible;
		const storeVisible = getContext('#storeVisible');
		component_subscribe($$self, storeVisible, value => $$invalidate(0, $storeVisible = value));

		function pointerdown_handler(event) {
			bubble.call(this, $$self, event);
		}

		const click_handler = () => set_store_value(storeVisible, $storeVisible = !$storeVisible, $storeVisible);
		return [$storeVisible, storeVisible, pointerdown_handler, click_handler];
	}

	class SearchButton extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
		}
	}

	/* src\components\search-main\SearchResults.svelte generated by Svelte v4.2.8 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[13] = list[i];
		return child_ctx;
	}

	// (41:6) {#if result.kind}
	function create_if_block$2(ctx) {
		let svg;
		let use;
		let use_href_value;

		return {
			c() {
				svg = svg_element("svg");
				use = svg_element("use");
				attr(use, "href", use_href_value = `${/*iconsPrepend*/ ctx[3]}#icon-${/*result*/ ctx[13].kind}`);
				attr(svg, "class", "tsd-kind-icon");
				attr(svg, "viewBox", "0 0 24 24");
			},
			m(target, anchor) {
				insert(target, svg, anchor);
				append(svg, use);
			},
			p(ctx, dirty) {
				if (dirty & /*results*/ 2 && use_href_value !== (use_href_value = `${/*iconsPrepend*/ ctx[3]}#icon-${/*result*/ ctx[13].kind}`)) {
					attr(use, "href", use_href_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(svg);
				}
			}
		};
	}

	// (35:0) {#each results as result (result.id)}
	function create_each_block(key_1, ctx) {
		let li;
		let t0;
		let span;
		let raw_value = /*result*/ ctx[13].name + "";
		let t1;
		let li_class_value;
		let mounted;
		let dispose;
		let if_block = /*result*/ ctx[13].kind && create_if_block$2(ctx);

		function click_handler() {
			return /*click_handler*/ ctx[9](/*result*/ ctx[13]);
		}

		return {
			key: key_1,
			first: null,
			c() {
				li = element("li");
				if (if_block) if_block.c();
				t0 = space();
				span = element("span");
				t1 = space();
				attr(span, "class", "parent");
				attr(li, "class", li_class_value = "" + (null_to_empty(/*result*/ ctx[13].classes) + " svelte-5rxzhp"));
				attr(li, "role", "menuitem");
				toggle_class(li, "selected", /*result*/ ctx[13].id === /*$storeCurrentId*/ ctx[2]);
				this.first = li;
			},
			m(target, anchor) {
				insert(target, li, anchor);
				if (if_block) if_block.m(li, null);
				append(li, t0);
				append(li, span);
				span.innerHTML = raw_value;
				append(li, t1);

				if (!mounted) {
					dispose = listen(li, "click", click_handler);
					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;

				if (/*result*/ ctx[13].kind) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.m(li, t0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*results*/ 2 && raw_value !== (raw_value = /*result*/ ctx[13].name + "")) span.innerHTML = raw_value;
				if (dirty & /*results*/ 2 && li_class_value !== (li_class_value = "" + (null_to_empty(/*result*/ ctx[13].classes) + " svelte-5rxzhp"))) {
					attr(li, "class", li_class_value);
				}

				if (dirty & /*results, results, $storeCurrentId*/ 6) {
					toggle_class(li, "selected", /*result*/ ctx[13].id === /*$storeCurrentId*/ ctx[2]);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(li);
				}

				if (if_block) if_block.d();
				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment$2(ctx) {
		let ul;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let ul_transition;
		let current;
		let each_value = ensure_array_like(/*results*/ ctx[1]);
		const get_key = ctx => /*result*/ ctx[13].id;

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		return {
			c() {
				ul = element("ul");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(ul, "class", "svelte-5rxzhp");
			},
			m(target, anchor) {
				insert(target, ul, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(ul, null);
					}
				}

				/*ul_binding*/ ctx[10](ul);
				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*results, $storeCurrentId, onClick, iconsPrepend*/ 270) {
					each_value = ensure_array_like(/*results*/ ctx[1]);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);
				}
			},
			i(local) {
				if (current) return;

				add_render_callback(() => {
					if (!current) return;
					if (!ul_transition) ul_transition = create_bidirectional_transition(ul, /*animateTransition*/ ctx[7], { duration: 100 }, true);
					ul_transition.run(1);
				});

				current = true;
			},
			o(local) {
				if (!ul_transition) ul_transition = create_bidirectional_transition(ul, /*animateTransition*/ ctx[7], { duration: 100 }, false);
				ul_transition.run(0);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(ul);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				/*ul_binding*/ ctx[10](null);
				if (detaching && ul_transition) ul_transition.end();
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let $storeVisible;
		let $storeSettingAnimate;
		let $storeCurrentId;
		let { results = void 0 } = $$props;
		let { resultsEl = void 0 } = $$props;

		/** @type {string} */
		const iconsPrepend = getContext('#iconsPrepend');

		/** @type {import('svelte/store').Writable<number>} */
		const storeCurrentId = getContext('#storeCurrentId');

		component_subscribe($$self, storeCurrentId, value => $$invalidate(2, $storeCurrentId = value));

		/** @type {import('svelte/store').Writable<boolean>} */
		const storeSettingAnimate = getContext('#storeSettingAnimate');

		component_subscribe($$self, storeSettingAnimate, value => $$invalidate(12, $storeSettingAnimate = value));

		/** @type {import('svelte/store').Writable<boolean>} */
		const storeVisible = getContext('#storeVisible');

		component_subscribe($$self, storeVisible, value => $$invalidate(11, $storeVisible = value));
		const animateTransition = $storeSettingAnimate ? slideFade : () => void 0;

		function onClick(href) {
			set_store_value(storeVisible, $storeVisible = false, $storeVisible);
			globalThis.location.href = href;
		}

		const click_handler = result => onClick(result.href);

		function ul_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				resultsEl = $$value;
				$$invalidate(0, resultsEl);
			});
		}

		$$self.$$set = $$props => {
			if ('results' in $$props) $$invalidate(1, results = $$props.results);
			if ('resultsEl' in $$props) $$invalidate(0, resultsEl = $$props.resultsEl);
		};

		return [
			resultsEl,
			results,
			$storeCurrentId,
			iconsPrepend,
			storeCurrentId,
			storeSettingAnimate,
			storeVisible,
			animateTransition,
			onClick,
			click_handler,
			ul_binding
		];
	}

	class SearchResults extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { results: 1, resultsEl: 0 });
		}
	}

	/**
	 * Note: The Lunr processing code in this source file is taken from the TypeDoc project and slightly modified to match
	 * the abbreviated fields in the DMT main search index data; {@link SearchDocument}.
	 *
	 * @see https://github.com/TypeStrong/typedoc/blob/master/src/lib/output/themes/default/assets/typedoc/components/Search.ts
	 */

	/**
	 * @param {string}   query - A search query.
	 *
	 * @param {object}   options - Options.
	 *
	 * @param {string}   options.basePath - The current relative base path.
	 *
	 * @param {boolean}  [options.navModuleIcon=true] - Include SVG icon / kind in results for modules.
	 *
	 * @param {boolean}  [options.searchFullName=false] - Always include parent reflection full name.
	 *
	 * @param {number}   [options.searchLimit=10] - Limit search results to the given value.
	 *
	 * @returns {ProcessedSearchDocument[]} Processed query results.
	 */
	function processSearchQuery(query, { basePath, navModuleIcon = true, searchFullName = false,
	 searchLimit = 10 } = {})
	{
	   if (!globalThis.dmtSearchMainIndex || !globalThis.dmtSearchMainRows) { return []; }

	   const searchText = query.trim();

	   if (searchText.length === 0) { return []; }

	   const indexResults = globalThis.dmtSearchMainIndex.search(`*${searchText}*`);

	   /** @type {ProcessedSearchDocument[]} */
	   const processedDocuments = [];

	   for (let i = 0; i < indexResults.length; i++)
	   {
	      const item = indexResults[i];
	      const row = globalThis.dmtSearchMainRows[Number(item.ref)];
	      let boost = 1;

	      // Boost by exact match on name.
	      if (row.n.toLowerCase().startsWith(searchText.toLowerCase())) // name
	      {
	         boost *= 1 + 1 / (1 + Math.abs(row.n.length - searchText.length)); // name
	      }

	      item.score *= boost;
	   }

	   indexResults.sort((a, b) => b.score - a.score);

	   for (let c = Math.min(searchLimit, indexResults.length), i = 0; i < c; i++)
	   {
	      const indexResult = indexResults[i];
	      const index = Number(indexResult.ref);
	      const row = globalThis.dmtSearchMainRows[index];

	      // Bold the matched part of the query in the search results
	      let name = boldMatches(row.n, searchText); // name

	      // TypeDoc may set this variable for debugging.
	      if (globalThis?.DEBUG_SEARCH_WEIGHTS) { name += ` (score: ${indexResult.score.toFixed(2)})`; }

	      // parent; always include parent full name when `searchFullName` option is true otherwise avoid showing module /
	      // package parents.
	      if (row.p && (searchFullName || row.pk !== 2))
	      {
	         name = `<span class="parent">${boldMatches(
          row.p,
          searchText
         )}.</span>${name}`;
	      }

	      // Don't include kind when theme option `navModuleIcon` is false and result is a `Module`.
	      const kind = !navModuleIcon && row.k === 2 ? void 0 : row.k;

	      processedDocuments.push({
	         id: index,
	         kind,
	         classes: row.c ?? '', // classes
	         href: `${basePath}${row.u}`, // URL
	         name
	      });
	   }

	   return processedDocuments;
	}

	/**
	 * @param {string}   text -
	 *
	 * @param {string}   search -
	 *
	 * @returns {string} Text w/ bold matches.
	 */
	function boldMatches(text, search)
	{
	   if (search === '') { return text; }

	   const lowerText = text.toLocaleLowerCase();
	   const lowerSearch = search.toLocaleLowerCase();

	   const parts = [];

	   let lastIndex = 0;
	   let index = lowerText.indexOf(lowerSearch);

	   while (index !== -1)
	   {
	      parts.push(
	       escapeHtml(text.substring(lastIndex, index)),
	       `<b>${escapeHtml(
        text.substring(index, index + lowerSearch.length)
       )}</b>`
	      );

	      lastIndex = index + lowerSearch.length;
	      index = lowerText.indexOf(lowerSearch, lastIndex);
	   }

	   parts.push(escapeHtml(text.substring(lastIndex)));

	   return parts.join('');
	}

	const SPECIAL_HTML = {
	   "&": "&amp;",
	   "<": "&lt;",
	   ">": "&gt;",
	   "'": "&#039;",
	   '"': "&quot;",
	};

	/**
	 * @param {string}   text -
	 *
	 * @returns {string} Escaped text.
	 */
	function escapeHtml(text)
	{
	   return text.replace(/[&<>"']/g, (match) => SPECIAL_HTML[match]);
	}

	/**
	 * @typedef {object} ProcessedSearchDocument Provides parsed presentation data for a SearchDocument found in a query.
	 *
	 * @property {number}   id A unique ID.
	 *
	 * @property {import('typedoc').ReflectionKind} kind The reflection kind.
	 *
	 * @property {string}   classes Any particular classes to apply regarding properties like private / inherited, etc.
	 *
	 * @property {string}   href The document link.
	 *
	 * @property {string}   name The document name HTML content.
	 */

	/* src\components\search-main\SearchField.svelte generated by Svelte v4.2.8 */

	const { window: window_1 } = globals;

	function create_if_block$1(ctx) {
		let searchresults;
		let updating_resultsEl;
		let current;

		function searchresults_resultsEl_binding(value) {
			/*searchresults_resultsEl_binding*/ ctx[13](value);
		}

		let searchresults_props = { results: /*results*/ ctx[0] };

		if (/*resultsEl*/ ctx[3] !== void 0) {
			searchresults_props.resultsEl = /*resultsEl*/ ctx[3];
		}

		searchresults = new SearchResults({ props: searchresults_props });
		binding_callbacks.push(() => bind(searchresults, 'resultsEl', searchresults_resultsEl_binding));

		return {
			c() {
				create_component(searchresults.$$.fragment);
			},
			m(target, anchor) {
				mount_component(searchresults, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const searchresults_changes = {};
				if (dirty & /*results*/ 1) searchresults_changes.results = /*results*/ ctx[0];

				if (!updating_resultsEl && dirty & /*resultsEl*/ 8) {
					updating_resultsEl = true;
					searchresults_changes.resultsEl = /*resultsEl*/ ctx[3];
					add_flush_callback(() => updating_resultsEl = false);
				}

				searchresults.$set(searchresults_changes);
			},
			i(local) {
				if (current) return;
				transition_in(searchresults.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(searchresults.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(searchresults, detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		let input;
		let input_transition;
		let t;
		let if_block_anchor;
		let current;
		let mounted;
		let dispose;
		let if_block = /*results*/ ctx[0].length && create_if_block$1(ctx);

		return {
			c() {
				input = element("input");
				t = space();
				if (if_block) if_block.c();
				if_block_anchor = empty();
				attr(input, "type", "search");
				attr(input, "id", "dmt-search-field");
				attr(input, "aria-label", "Search");
				attr(input, "class", "svelte-tuln0o");
				set_style(input, "color", /*invalidQuery*/ ctx[4] ? 'red' : null);
				set_style(input, "border-color", /*invalidQuery*/ ctx[4] ? 'red' : null);
			},
			m(target, anchor) {
				insert(target, input, anchor);
				/*input_binding*/ ctx[11](input);
				set_input_value(input, /*$storeQuery*/ ctx[1]);
				insert(target, t, anchor);
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen(window_1, "pointerdown", /*handlePointerdown*/ ctx[10]),
						listen(input, "input", /*input_input_handler*/ ctx[12]),
						listen(input, "keydown", /*handleKeydown*/ ctx[9])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*$storeQuery*/ 2 && input.value !== /*$storeQuery*/ ctx[1]) {
					set_input_value(input, /*$storeQuery*/ ctx[1]);
				}

				if (dirty & /*invalidQuery*/ 16) {
					set_style(input, "color", /*invalidQuery*/ ctx[4] ? 'red' : null);
				}

				if (dirty & /*invalidQuery*/ 16) {
					set_style(input, "border-color", /*invalidQuery*/ ctx[4] ? 'red' : null);
				}

				if (/*results*/ ctx[0].length) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*results*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (!input_transition) input_transition = create_bidirectional_transition(input, /*animateTransition*/ ctx[8], { duration: 200 }, true);
						input_transition.run(1);
					});
				}

				transition_in(if_block);
				current = true;
			},
			o(local) {
				if (local) {
					if (!input_transition) input_transition = create_bidirectional_transition(input, /*animateTransition*/ ctx[8], { duration: 200 }, false);
					input_transition.run(0);
				}

				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(input);
					detach(t);
					detach(if_block_anchor);
				}

				/*input_binding*/ ctx[11](null);
				if (detaching && input_transition) input_transition.end();
				if (if_block) if_block.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let invalidQuery;
		let $storeVisible;
		let $storeQuery;
		let $storeSettingAnimate;
		const storeCurrentId = writable(void 0);
		setContext('#storeCurrentId', storeCurrentId);

		/** @type {string} */
		const basePath = getContext('#basePath');

		/** @type {boolean} */
		const navModuleIcon = getContext('#navModuleIcon');

		/** @type {boolean} */
		const searchFullName = getContext('#searchFullName');

		/** @type {number} */
		const searchLimit = getContext('#searchLimit');

		/** @type {import('svelte/store').Writable<boolean>} */
		const storeVisible = getContext('#storeVisible');

		component_subscribe($$self, storeVisible, value => $$invalidate(15, $storeVisible = value));

		/** @type {import('svelte/store').Writable<boolean>} */
		const storeSettingAnimate = getContext('#storeSettingAnimate');

		component_subscribe($$self, storeSettingAnimate, value => $$invalidate(16, $storeSettingAnimate = value));

		/**
	 * Stores the input query string from the main search input element.
	 *
	 * @type {import('svelte/store').Writable<string>}
	 */
		const storeQuery = writable('');

		component_subscribe($$self, storeQuery, value => $$invalidate(1, $storeQuery = value));
		const animateTransition = $storeSettingAnimate ? slideFade : () => void 0;

		const queryOptions = {
			basePath,
			navModuleIcon,
			searchFullName,
			searchLimit
		};

		let currentIndex = 0;

		/** @type {HTMLInputElement} */
		let inputEl;

		/** @type {ProcessedSearchDocument[]} */
		let results;

		/**
	 * Bound from {@link SearchResults} to check for window pointer down events outside input & results elements.
	 *
	 * @type {HTMLUListElement}
	 */
		let resultsEl;

		// Focus input element on mount.
		onMount(() => inputEl.focus());

		/**
	 * Detects navigation input modifying current selected ID.
	 *
	 * @param {KeyboardEvent}  event -
	 */
		function handleKeydown(event) {
			switch (event.code) {
				case 'ArrowDown':
					if (results.length === 0) {
						return;
					}
					if (currentIndex < results.length - 1) {
						storeCurrentId.set(results[++currentIndex].id);
						event.preventDefault();
					}
					break;
				case 'ArrowUp':
					if (results.length === 0) {
						return;
					}
					if (currentIndex > 0) {
						storeCurrentId.set(results[--currentIndex].id);
						event.preventDefault();
					}
					break;
				case 'Enter':
					if (currentIndex >= 0) {
						window.location.href = results[currentIndex].href;
					}
					event.preventDefault();
					break;
				case 'Escape':
					// Only set visibility to false when the query is empty.
					if ($storeVisible && !$storeQuery.length) {
						set_store_value(storeVisible, $storeVisible = false, $storeVisible);
					}
					break;
				case 'Tab':
					if (results.length === 0) {
						event.preventDefault();
						return;
					}
					if (event.shiftKey) {
						if (currentIndex > 0) {
							storeCurrentId.set(results[--currentIndex].id);
						}
					} else if (currentIndex < results.length - 1) {
						storeCurrentId.set(results[++currentIndex].id);
					}
					event.preventDefault();
					break;
			}

			// Prevents global key commands from activating when main search is active.
			event.stopPropagation();
		}

		/**
	 * Handles browser window pointer down events; setting the search query UI not visible if the target is outside the
	 * search query UI.
	 *
	 * @param {PointerEvent}   event -
	 */
		function handlePointerdown(event) {
			if (event.target !== inputEl && !resultsEl?.contains?.(event.target)) {
				set_store_value(storeVisible, $storeVisible = false, $storeVisible);
			}
		}

		function input_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				inputEl = $$value;
				$$invalidate(2, inputEl);
			});
		}

		function input_input_handler() {
			$storeQuery = this.value;
			storeQuery.set($storeQuery);
		}

		function searchresults_resultsEl_binding(value) {
			resultsEl = value;
			$$invalidate(3, resultsEl);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$storeQuery*/ 2) {
				// Perform the search when the query input changes.
				{
					$$invalidate(0, results = processSearchQuery($storeQuery, { ...queryOptions }));
					currentIndex = -1;
					storeCurrentId.set(void 0);
				}
			}

			if ($$self.$$.dirty & /*$storeQuery, results*/ 3) {
				// When the query string has some input, but results are empty use `invalidQuery` to apply an inline color of red.
				$$invalidate(4, invalidQuery = $storeQuery.length && !results?.length);
			}
		};

		return [
			results,
			$storeQuery,
			inputEl,
			resultsEl,
			invalidQuery,
			storeVisible,
			storeSettingAnimate,
			storeQuery,
			animateTransition,
			handleKeydown,
			handlePointerdown,
			input_binding,
			input_input_handler,
			searchresults_resultsEl_binding
		];
	}

	class SearchField extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
		}
	}

	/* src\components\search-main\SearchMain.svelte generated by Svelte v4.2.8 */

	function create_if_block(ctx) {
		let searchfield;
		let current;
		searchfield = new SearchField({});

		return {
			c() {
				create_component(searchfield.$$.fragment);
			},
			m(target, anchor) {
				mount_component(searchfield, target, anchor);
				current = true;
			},
			i(local) {
				if (current) return;
				transition_in(searchfield.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(searchfield.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(searchfield, detaching);
			}
		};
	}

	function create_fragment(ctx) {
		let t;
		let div;
		let searchbutton;
		let current;
		let mounted;
		let dispose;
		let if_block = /*$storeVisible*/ ctx[0] && create_if_block();
		searchbutton = new SearchButton({});

		return {
			c() {
				if (if_block) if_block.c();
				t = space();
				div = element("div");
				create_component(searchbutton.$$.fragment);
				attr(div, "class", "dmt-widget dmt-toolbar-icon search no-caption svelte-wmon9h");
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, t, anchor);
				insert(target, div, anchor);
				mount_component(searchbutton, div, null);
				current = true;

				if (!mounted) {
					dispose = listen(window, "keydown", /*handleKeydown*/ ctx[2]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (/*$storeVisible*/ ctx[0]) {
					if (if_block) {
						if (dirty & /*$storeVisible*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block();
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(t.parentNode, t);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				transition_in(searchbutton.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				transition_out(searchbutton.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(t);
					detach(div);
				}

				if (if_block) if_block.d(detaching);
				destroy_component(searchbutton);
				mounted = false;
				dispose();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let $storeVisible;
		let { dmtComponentData = void 0 } = $$props;

		/** @type {import('svelte/store').Writable<boolean>} */
		const storeVisible = writable(false);

		component_subscribe($$self, storeVisible, value => $$invalidate(0, $storeVisible = value));
		setContext('#basePath', dmtComponentData.basePath);
		setContext('#iconsPrepend', dmtComponentData.iconsPrepend);
		setContext('#navModuleIcon', dmtComponentData.navModuleIcon);
		setContext('#searchFullName', dmtComponentData.search.fullName);
		setContext('#searchLimit', dmtComponentData.search?.limit ?? 10);
		setContext('#storeVisible', storeVisible);
		setContext('#storeSettingAnimate', dmtComponentData.dmtLocalStorage.getStore(localConstants.dmtThemeAnimate));

		/**
	 * Open search when <Alt-s> is pressed.
	 *
	 * @param {KeyboardEvent}  event -
	 */
		function handleKeydown(event) {
			if (!event.altKey || event.repeat) {
				return;
			}

			switch (event.code) {
				case 'KeyS':
					event.preventDefault();
					set_store_value(storeVisible, $storeVisible = true, $storeVisible);
					break;
			}
		}

		$$self.$$set = $$props => {
			if ('dmtComponentData' in $$props) $$invalidate(3, dmtComponentData = $$props.dmtComponentData);
		};

		return [$storeVisible, storeVisible, handleKeydown, dmtComponentData];
	}

	class SearchMain extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, { dmtComponentData: 3 });
		}
	}

	const SearchMain$1 = SearchMain;

	var lunr = {exports: {}};

	/**
	 * lunr - http://lunrjs.com - A bit like Solr, but much smaller and not as bright - 2.3.9
	 * Copyright (C) 2020 Oliver Nightingale
	 * @license MIT
	 */

	(function (module, exports) {
	(function(){

		/**
		 * A convenience function for configuring and constructing
		 * a new lunr Index.
		 *
		 * A lunr.Builder instance is created and the pipeline setup
		 * with a trimmer, stop word filter and stemmer.
		 *
		 * This builder object is yielded to the configuration function
		 * that is passed as a parameter, allowing the list of fields
		 * and other builder parameters to be customised.
		 *
		 * All documents _must_ be added within the passed config function.
		 *
		 * @example
		 * var idx = lunr(function () {
		 *   this.field('title')
		 *   this.field('body')
		 *   this.ref('id')
		 *
		 *   documents.forEach(function (doc) {
		 *     this.add(doc)
		 *   }, this)
		 * })
		 *
		 * @see {@link lunr.Builder}
		 * @see {@link lunr.Pipeline}
		 * @see {@link lunr.trimmer}
		 * @see {@link lunr.stopWordFilter}
		 * @see {@link lunr.stemmer}
		 * @namespace {function} lunr
		 */
		var lunr = function (config) {
		  var builder = new lunr.Builder;

		  builder.pipeline.add(
		    lunr.trimmer,
		    lunr.stopWordFilter,
		    lunr.stemmer
		  );

		  builder.searchPipeline.add(
		    lunr.stemmer
		  );

		  config.call(builder, builder);
		  return builder.build()
		};

		lunr.version = "2.3.9";
		/*!
		 * lunr.utils
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * A namespace containing utils for the rest of the lunr library
		 * @namespace lunr.utils
		 */
		lunr.utils = {};

		/**
		 * Print a warning message to the console.
		 *
		 * @param {String} message The message to be printed.
		 * @memberOf lunr.utils
		 * @function
		 */
		lunr.utils.warn = (function (global) {
		  /* eslint-disable no-console */
		  return function (message) {
		    if (global.console && console.warn) {
		      console.warn(message);
		    }
		  }
		  /* eslint-enable no-console */
		})(this);

		/**
		 * Convert an object to a string.
		 *
		 * In the case of `null` and `undefined` the function returns
		 * the empty string, in all other cases the result of calling
		 * `toString` on the passed object is returned.
		 *
		 * @param {Any} obj The object to convert to a string.
		 * @return {String} string representation of the passed object.
		 * @memberOf lunr.utils
		 */
		lunr.utils.asString = function (obj) {
		  if (obj === void 0 || obj === null) {
		    return ""
		  } else {
		    return obj.toString()
		  }
		};

		/**
		 * Clones an object.
		 *
		 * Will create a copy of an existing object such that any mutations
		 * on the copy cannot affect the original.
		 *
		 * Only shallow objects are supported, passing a nested object to this
		 * function will cause a TypeError.
		 *
		 * Objects with primitives, and arrays of primitives are supported.
		 *
		 * @param {Object} obj The object to clone.
		 * @return {Object} a clone of the passed object.
		 * @throws {TypeError} when a nested object is passed.
		 * @memberOf Utils
		 */
		lunr.utils.clone = function (obj) {
		  if (obj === null || obj === undefined) {
		    return obj
		  }

		  var clone = Object.create(null),
		      keys = Object.keys(obj);

		  for (var i = 0; i < keys.length; i++) {
		    var key = keys[i],
		        val = obj[key];

		    if (Array.isArray(val)) {
		      clone[key] = val.slice();
		      continue
		    }

		    if (typeof val === 'string' ||
		        typeof val === 'number' ||
		        typeof val === 'boolean') {
		      clone[key] = val;
		      continue
		    }

		    throw new TypeError("clone is not deep and does not support nested objects")
		  }

		  return clone
		};
		lunr.FieldRef = function (docRef, fieldName, stringValue) {
		  this.docRef = docRef;
		  this.fieldName = fieldName;
		  this._stringValue = stringValue;
		};

		lunr.FieldRef.joiner = "/";

		lunr.FieldRef.fromString = function (s) {
		  var n = s.indexOf(lunr.FieldRef.joiner);

		  if (n === -1) {
		    throw "malformed field ref string"
		  }

		  var fieldRef = s.slice(0, n),
		      docRef = s.slice(n + 1);

		  return new lunr.FieldRef (docRef, fieldRef, s)
		};

		lunr.FieldRef.prototype.toString = function () {
		  if (this._stringValue == undefined) {
		    this._stringValue = this.fieldName + lunr.FieldRef.joiner + this.docRef;
		  }

		  return this._stringValue
		};
		/*!
		 * lunr.Set
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * A lunr set.
		 *
		 * @constructor
		 */
		lunr.Set = function (elements) {
		  this.elements = Object.create(null);

		  if (elements) {
		    this.length = elements.length;

		    for (var i = 0; i < this.length; i++) {
		      this.elements[elements[i]] = true;
		    }
		  } else {
		    this.length = 0;
		  }
		};

		/**
		 * A complete set that contains all elements.
		 *
		 * @static
		 * @readonly
		 * @type {lunr.Set}
		 */
		lunr.Set.complete = {
		  intersect: function (other) {
		    return other
		  },

		  union: function () {
		    return this
		  },

		  contains: function () {
		    return true
		  }
		};

		/**
		 * An empty set that contains no elements.
		 *
		 * @static
		 * @readonly
		 * @type {lunr.Set}
		 */
		lunr.Set.empty = {
		  intersect: function () {
		    return this
		  },

		  union: function (other) {
		    return other
		  },

		  contains: function () {
		    return false
		  }
		};

		/**
		 * Returns true if this set contains the specified object.
		 *
		 * @param {object} object - Object whose presence in this set is to be tested.
		 * @returns {boolean} - True if this set contains the specified object.
		 */
		lunr.Set.prototype.contains = function (object) {
		  return !!this.elements[object]
		};

		/**
		 * Returns a new set containing only the elements that are present in both
		 * this set and the specified set.
		 *
		 * @param {lunr.Set} other - set to intersect with this set.
		 * @returns {lunr.Set} a new set that is the intersection of this and the specified set.
		 */

		lunr.Set.prototype.intersect = function (other) {
		  var a, b, elements, intersection = [];

		  if (other === lunr.Set.complete) {
		    return this
		  }

		  if (other === lunr.Set.empty) {
		    return other
		  }

		  if (this.length < other.length) {
		    a = this;
		    b = other;
		  } else {
		    a = other;
		    b = this;
		  }

		  elements = Object.keys(a.elements);

		  for (var i = 0; i < elements.length; i++) {
		    var element = elements[i];
		    if (element in b.elements) {
		      intersection.push(element);
		    }
		  }

		  return new lunr.Set (intersection)
		};

		/**
		 * Returns a new set combining the elements of this and the specified set.
		 *
		 * @param {lunr.Set} other - set to union with this set.
		 * @return {lunr.Set} a new set that is the union of this and the specified set.
		 */

		lunr.Set.prototype.union = function (other) {
		  if (other === lunr.Set.complete) {
		    return lunr.Set.complete
		  }

		  if (other === lunr.Set.empty) {
		    return this
		  }

		  return new lunr.Set(Object.keys(this.elements).concat(Object.keys(other.elements)))
		};
		/**
		 * A function to calculate the inverse document frequency for
		 * a posting. This is shared between the builder and the index
		 *
		 * @private
		 * @param {object} posting - The posting for a given term
		 * @param {number} documentCount - The total number of documents.
		 */
		lunr.idf = function (posting, documentCount) {
		  var documentsWithTerm = 0;

		  for (var fieldName in posting) {
		    if (fieldName == '_index') continue // Ignore the term index, its not a field
		    documentsWithTerm += Object.keys(posting[fieldName]).length;
		  }

		  var x = (documentCount - documentsWithTerm + 0.5) / (documentsWithTerm + 0.5);

		  return Math.log(1 + Math.abs(x))
		};

		/**
		 * A token wraps a string representation of a token
		 * as it is passed through the text processing pipeline.
		 *
		 * @constructor
		 * @param {string} [str=''] - The string token being wrapped.
		 * @param {object} [metadata={}] - Metadata associated with this token.
		 */
		lunr.Token = function (str, metadata) {
		  this.str = str || "";
		  this.metadata = metadata || {};
		};

		/**
		 * Returns the token string that is being wrapped by this object.
		 *
		 * @returns {string}
		 */
		lunr.Token.prototype.toString = function () {
		  return this.str
		};

		/**
		 * A token update function is used when updating or optionally
		 * when cloning a token.
		 *
		 * @callback lunr.Token~updateFunction
		 * @param {string} str - The string representation of the token.
		 * @param {Object} metadata - All metadata associated with this token.
		 */

		/**
		 * Applies the given function to the wrapped string token.
		 *
		 * @example
		 * token.update(function (str, metadata) {
		 *   return str.toUpperCase()
		 * })
		 *
		 * @param {lunr.Token~updateFunction} fn - A function to apply to the token string.
		 * @returns {lunr.Token}
		 */
		lunr.Token.prototype.update = function (fn) {
		  this.str = fn(this.str, this.metadata);
		  return this
		};

		/**
		 * Creates a clone of this token. Optionally a function can be
		 * applied to the cloned token.
		 *
		 * @param {lunr.Token~updateFunction} [fn] - An optional function to apply to the cloned token.
		 * @returns {lunr.Token}
		 */
		lunr.Token.prototype.clone = function (fn) {
		  fn = fn || function (s) { return s };
		  return new lunr.Token (fn(this.str, this.metadata), this.metadata)
		};
		/*!
		 * lunr.tokenizer
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * A function for splitting a string into tokens ready to be inserted into
		 * the search index. Uses `lunr.tokenizer.separator` to split strings, change
		 * the value of this property to change how strings are split into tokens.
		 *
		 * This tokenizer will convert its parameter to a string by calling `toString` and
		 * then will split this string on the character in `lunr.tokenizer.separator`.
		 * Arrays will have their elements converted to strings and wrapped in a lunr.Token.
		 *
		 * Optional metadata can be passed to the tokenizer, this metadata will be cloned and
		 * added as metadata to every token that is created from the object to be tokenized.
		 *
		 * @static
		 * @param {?(string|object|object[])} obj - The object to convert into tokens
		 * @param {?object} metadata - Optional metadata to associate with every token
		 * @returns {lunr.Token[]}
		 * @see {@link lunr.Pipeline}
		 */
		lunr.tokenizer = function (obj, metadata) {
		  if (obj == null || obj == undefined) {
		    return []
		  }

		  if (Array.isArray(obj)) {
		    return obj.map(function (t) {
		      return new lunr.Token(
		        lunr.utils.asString(t).toLowerCase(),
		        lunr.utils.clone(metadata)
		      )
		    })
		  }

		  var str = obj.toString().toLowerCase(),
		      len = str.length,
		      tokens = [];

		  for (var sliceEnd = 0, sliceStart = 0; sliceEnd <= len; sliceEnd++) {
		    var char = str.charAt(sliceEnd),
		        sliceLength = sliceEnd - sliceStart;

		    if ((char.match(lunr.tokenizer.separator) || sliceEnd == len)) {

		      if (sliceLength > 0) {
		        var tokenMetadata = lunr.utils.clone(metadata) || {};
		        tokenMetadata["position"] = [sliceStart, sliceLength];
		        tokenMetadata["index"] = tokens.length;

		        tokens.push(
		          new lunr.Token (
		            str.slice(sliceStart, sliceEnd),
		            tokenMetadata
		          )
		        );
		      }

		      sliceStart = sliceEnd + 1;
		    }

		  }

		  return tokens
		};

		/**
		 * The separator used to split a string into tokens. Override this property to change the behaviour of
		 * `lunr.tokenizer` behaviour when tokenizing strings. By default this splits on whitespace and hyphens.
		 *
		 * @static
		 * @see lunr.tokenizer
		 */
		lunr.tokenizer.separator = /[\s\-]+/;
		/*!
		 * lunr.Pipeline
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * lunr.Pipelines maintain an ordered list of functions to be applied to all
		 * tokens in documents entering the search index and queries being ran against
		 * the index.
		 *
		 * An instance of lunr.Index created with the lunr shortcut will contain a
		 * pipeline with a stop word filter and an English language stemmer. Extra
		 * functions can be added before or after either of these functions or these
		 * default functions can be removed.
		 *
		 * When run the pipeline will call each function in turn, passing a token, the
		 * index of that token in the original list of all tokens and finally a list of
		 * all the original tokens.
		 *
		 * The output of functions in the pipeline will be passed to the next function
		 * in the pipeline. To exclude a token from entering the index the function
		 * should return undefined, the rest of the pipeline will not be called with
		 * this token.
		 *
		 * For serialisation of pipelines to work, all functions used in an instance of
		 * a pipeline should be registered with lunr.Pipeline. Registered functions can
		 * then be loaded. If trying to load a serialised pipeline that uses functions
		 * that are not registered an error will be thrown.
		 *
		 * If not planning on serialising the pipeline then registering pipeline functions
		 * is not necessary.
		 *
		 * @constructor
		 */
		lunr.Pipeline = function () {
		  this._stack = [];
		};

		lunr.Pipeline.registeredFunctions = Object.create(null);

		/**
		 * A pipeline function maps lunr.Token to lunr.Token. A lunr.Token contains the token
		 * string as well as all known metadata. A pipeline function can mutate the token string
		 * or mutate (or add) metadata for a given token.
		 *
		 * A pipeline function can indicate that the passed token should be discarded by returning
		 * null, undefined or an empty string. This token will not be passed to any downstream pipeline
		 * functions and will not be added to the index.
		 *
		 * Multiple tokens can be returned by returning an array of tokens. Each token will be passed
		 * to any downstream pipeline functions and all will returned tokens will be added to the index.
		 *
		 * Any number of pipeline functions may be chained together using a lunr.Pipeline.
		 *
		 * @interface lunr.PipelineFunction
		 * @param {lunr.Token} token - A token from the document being processed.
		 * @param {number} i - The index of this token in the complete list of tokens for this document/field.
		 * @param {lunr.Token[]} tokens - All tokens for this document/field.
		 * @returns {(?lunr.Token|lunr.Token[])}
		 */

		/**
		 * Register a function with the pipeline.
		 *
		 * Functions that are used in the pipeline should be registered if the pipeline
		 * needs to be serialised, or a serialised pipeline needs to be loaded.
		 *
		 * Registering a function does not add it to a pipeline, functions must still be
		 * added to instances of the pipeline for them to be used when running a pipeline.
		 *
		 * @param {lunr.PipelineFunction} fn - The function to check for.
		 * @param {String} label - The label to register this function with
		 */
		lunr.Pipeline.registerFunction = function (fn, label) {
		  if (label in this.registeredFunctions) {
		    lunr.utils.warn('Overwriting existing registered function: ' + label);
		  }

		  fn.label = label;
		  lunr.Pipeline.registeredFunctions[fn.label] = fn;
		};

		/**
		 * Warns if the function is not registered as a Pipeline function.
		 *
		 * @param {lunr.PipelineFunction} fn - The function to check for.
		 * @private
		 */
		lunr.Pipeline.warnIfFunctionNotRegistered = function (fn) {
		  var isRegistered = fn.label && (fn.label in this.registeredFunctions);

		  if (!isRegistered) {
		    lunr.utils.warn('Function is not registered with pipeline. This may cause problems when serialising the index.\n', fn);
		  }
		};

		/**
		 * Loads a previously serialised pipeline.
		 *
		 * All functions to be loaded must already be registered with lunr.Pipeline.
		 * If any function from the serialised data has not been registered then an
		 * error will be thrown.
		 *
		 * @param {Object} serialised - The serialised pipeline to load.
		 * @returns {lunr.Pipeline}
		 */
		lunr.Pipeline.load = function (serialised) {
		  var pipeline = new lunr.Pipeline;

		  serialised.forEach(function (fnName) {
		    var fn = lunr.Pipeline.registeredFunctions[fnName];

		    if (fn) {
		      pipeline.add(fn);
		    } else {
		      throw new Error('Cannot load unregistered function: ' + fnName)
		    }
		  });

		  return pipeline
		};

		/**
		 * Adds new functions to the end of the pipeline.
		 *
		 * Logs a warning if the function has not been registered.
		 *
		 * @param {lunr.PipelineFunction[]} functions - Any number of functions to add to the pipeline.
		 */
		lunr.Pipeline.prototype.add = function () {
		  var fns = Array.prototype.slice.call(arguments);

		  fns.forEach(function (fn) {
		    lunr.Pipeline.warnIfFunctionNotRegistered(fn);
		    this._stack.push(fn);
		  }, this);
		};

		/**
		 * Adds a single function after a function that already exists in the
		 * pipeline.
		 *
		 * Logs a warning if the function has not been registered.
		 *
		 * @param {lunr.PipelineFunction} existingFn - A function that already exists in the pipeline.
		 * @param {lunr.PipelineFunction} newFn - The new function to add to the pipeline.
		 */
		lunr.Pipeline.prototype.after = function (existingFn, newFn) {
		  lunr.Pipeline.warnIfFunctionNotRegistered(newFn);

		  var pos = this._stack.indexOf(existingFn);
		  if (pos == -1) {
		    throw new Error('Cannot find existingFn')
		  }

		  pos = pos + 1;
		  this._stack.splice(pos, 0, newFn);
		};

		/**
		 * Adds a single function before a function that already exists in the
		 * pipeline.
		 *
		 * Logs a warning if the function has not been registered.
		 *
		 * @param {lunr.PipelineFunction} existingFn - A function that already exists in the pipeline.
		 * @param {lunr.PipelineFunction} newFn - The new function to add to the pipeline.
		 */
		lunr.Pipeline.prototype.before = function (existingFn, newFn) {
		  lunr.Pipeline.warnIfFunctionNotRegistered(newFn);

		  var pos = this._stack.indexOf(existingFn);
		  if (pos == -1) {
		    throw new Error('Cannot find existingFn')
		  }

		  this._stack.splice(pos, 0, newFn);
		};

		/**
		 * Removes a function from the pipeline.
		 *
		 * @param {lunr.PipelineFunction} fn The function to remove from the pipeline.
		 */
		lunr.Pipeline.prototype.remove = function (fn) {
		  var pos = this._stack.indexOf(fn);
		  if (pos == -1) {
		    return
		  }

		  this._stack.splice(pos, 1);
		};

		/**
		 * Runs the current list of functions that make up the pipeline against the
		 * passed tokens.
		 *
		 * @param {Array} tokens The tokens to run through the pipeline.
		 * @returns {Array}
		 */
		lunr.Pipeline.prototype.run = function (tokens) {
		  var stackLength = this._stack.length;

		  for (var i = 0; i < stackLength; i++) {
		    var fn = this._stack[i];
		    var memo = [];

		    for (var j = 0; j < tokens.length; j++) {
		      var result = fn(tokens[j], j, tokens);

		      if (result === null || result === void 0 || result === '') continue

		      if (Array.isArray(result)) {
		        for (var k = 0; k < result.length; k++) {
		          memo.push(result[k]);
		        }
		      } else {
		        memo.push(result);
		      }
		    }

		    tokens = memo;
		  }

		  return tokens
		};

		/**
		 * Convenience method for passing a string through a pipeline and getting
		 * strings out. This method takes care of wrapping the passed string in a
		 * token and mapping the resulting tokens back to strings.
		 *
		 * @param {string} str - The string to pass through the pipeline.
		 * @param {?object} metadata - Optional metadata to associate with the token
		 * passed to the pipeline.
		 * @returns {string[]}
		 */
		lunr.Pipeline.prototype.runString = function (str, metadata) {
		  var token = new lunr.Token (str, metadata);

		  return this.run([token]).map(function (t) {
		    return t.toString()
		  })
		};

		/**
		 * Resets the pipeline by removing any existing processors.
		 *
		 */
		lunr.Pipeline.prototype.reset = function () {
		  this._stack = [];
		};

		/**
		 * Returns a representation of the pipeline ready for serialisation.
		 *
		 * Logs a warning if the function has not been registered.
		 *
		 * @returns {Array}
		 */
		lunr.Pipeline.prototype.toJSON = function () {
		  return this._stack.map(function (fn) {
		    lunr.Pipeline.warnIfFunctionNotRegistered(fn);

		    return fn.label
		  })
		};
		/*!
		 * lunr.Vector
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * A vector is used to construct the vector space of documents and queries. These
		 * vectors support operations to determine the similarity between two documents or
		 * a document and a query.
		 *
		 * Normally no parameters are required for initializing a vector, but in the case of
		 * loading a previously dumped vector the raw elements can be provided to the constructor.
		 *
		 * For performance reasons vectors are implemented with a flat array, where an elements
		 * index is immediately followed by its value. E.g. [index, value, index, value]. This
		 * allows the underlying array to be as sparse as possible and still offer decent
		 * performance when being used for vector calculations.
		 *
		 * @constructor
		 * @param {Number[]} [elements] - The flat list of element index and element value pairs.
		 */
		lunr.Vector = function (elements) {
		  this._magnitude = 0;
		  this.elements = elements || [];
		};


		/**
		 * Calculates the position within the vector to insert a given index.
		 *
		 * This is used internally by insert and upsert. If there are duplicate indexes then
		 * the position is returned as if the value for that index were to be updated, but it
		 * is the callers responsibility to check whether there is a duplicate at that index
		 *
		 * @param {Number} insertIdx - The index at which the element should be inserted.
		 * @returns {Number}
		 */
		lunr.Vector.prototype.positionForIndex = function (index) {
		  // For an empty vector the tuple can be inserted at the beginning
		  if (this.elements.length == 0) {
		    return 0
		  }

		  var start = 0,
		      end = this.elements.length / 2,
		      sliceLength = end - start,
		      pivotPoint = Math.floor(sliceLength / 2),
		      pivotIndex = this.elements[pivotPoint * 2];

		  while (sliceLength > 1) {
		    if (pivotIndex < index) {
		      start = pivotPoint;
		    }

		    if (pivotIndex > index) {
		      end = pivotPoint;
		    }

		    if (pivotIndex == index) {
		      break
		    }

		    sliceLength = end - start;
		    pivotPoint = start + Math.floor(sliceLength / 2);
		    pivotIndex = this.elements[pivotPoint * 2];
		  }

		  if (pivotIndex == index) {
		    return pivotPoint * 2
		  }

		  if (pivotIndex > index) {
		    return pivotPoint * 2
		  }

		  if (pivotIndex < index) {
		    return (pivotPoint + 1) * 2
		  }
		};

		/**
		 * Inserts an element at an index within the vector.
		 *
		 * Does not allow duplicates, will throw an error if there is already an entry
		 * for this index.
		 *
		 * @param {Number} insertIdx - The index at which the element should be inserted.
		 * @param {Number} val - The value to be inserted into the vector.
		 */
		lunr.Vector.prototype.insert = function (insertIdx, val) {
		  this.upsert(insertIdx, val, function () {
		    throw "duplicate index"
		  });
		};

		/**
		 * Inserts or updates an existing index within the vector.
		 *
		 * @param {Number} insertIdx - The index at which the element should be inserted.
		 * @param {Number} val - The value to be inserted into the vector.
		 * @param {function} fn - A function that is called for updates, the existing value and the
		 * requested value are passed as arguments
		 */
		lunr.Vector.prototype.upsert = function (insertIdx, val, fn) {
		  this._magnitude = 0;
		  var position = this.positionForIndex(insertIdx);

		  if (this.elements[position] == insertIdx) {
		    this.elements[position + 1] = fn(this.elements[position + 1], val);
		  } else {
		    this.elements.splice(position, 0, insertIdx, val);
		  }
		};

		/**
		 * Calculates the magnitude of this vector.
		 *
		 * @returns {Number}
		 */
		lunr.Vector.prototype.magnitude = function () {
		  if (this._magnitude) return this._magnitude

		  var sumOfSquares = 0,
		      elementsLength = this.elements.length;

		  for (var i = 1; i < elementsLength; i += 2) {
		    var val = this.elements[i];
		    sumOfSquares += val * val;
		  }

		  return this._magnitude = Math.sqrt(sumOfSquares)
		};

		/**
		 * Calculates the dot product of this vector and another vector.
		 *
		 * @param {lunr.Vector} otherVector - The vector to compute the dot product with.
		 * @returns {Number}
		 */
		lunr.Vector.prototype.dot = function (otherVector) {
		  var dotProduct = 0,
		      a = this.elements, b = otherVector.elements,
		      aLen = a.length, bLen = b.length,
		      aVal = 0, bVal = 0,
		      i = 0, j = 0;

		  while (i < aLen && j < bLen) {
		    aVal = a[i], bVal = b[j];
		    if (aVal < bVal) {
		      i += 2;
		    } else if (aVal > bVal) {
		      j += 2;
		    } else if (aVal == bVal) {
		      dotProduct += a[i + 1] * b[j + 1];
		      i += 2;
		      j += 2;
		    }
		  }

		  return dotProduct
		};

		/**
		 * Calculates the similarity between this vector and another vector.
		 *
		 * @param {lunr.Vector} otherVector - The other vector to calculate the
		 * similarity with.
		 * @returns {Number}
		 */
		lunr.Vector.prototype.similarity = function (otherVector) {
		  return this.dot(otherVector) / this.magnitude() || 0
		};

		/**
		 * Converts the vector to an array of the elements within the vector.
		 *
		 * @returns {Number[]}
		 */
		lunr.Vector.prototype.toArray = function () {
		  var output = new Array (this.elements.length / 2);

		  for (var i = 1, j = 0; i < this.elements.length; i += 2, j++) {
		    output[j] = this.elements[i];
		  }

		  return output
		};

		/**
		 * A JSON serializable representation of the vector.
		 *
		 * @returns {Number[]}
		 */
		lunr.Vector.prototype.toJSON = function () {
		  return this.elements
		};
		/* eslint-disable */
		/*!
		 * lunr.stemmer
		 * Copyright (C) 2020 Oliver Nightingale
		 * Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
		 */

		/**
		 * lunr.stemmer is an english language stemmer, this is a JavaScript
		 * implementation of the PorterStemmer taken from http://tartarus.org/~martin
		 *
		 * @static
		 * @implements {lunr.PipelineFunction}
		 * @param {lunr.Token} token - The string to stem
		 * @returns {lunr.Token}
		 * @see {@link lunr.Pipeline}
		 * @function
		 */
		lunr.stemmer = (function(){
		  var step2list = {
		      "ational" : "ate",
		      "tional" : "tion",
		      "enci" : "ence",
		      "anci" : "ance",
		      "izer" : "ize",
		      "bli" : "ble",
		      "alli" : "al",
		      "entli" : "ent",
		      "eli" : "e",
		      "ousli" : "ous",
		      "ization" : "ize",
		      "ation" : "ate",
		      "ator" : "ate",
		      "alism" : "al",
		      "iveness" : "ive",
		      "fulness" : "ful",
		      "ousness" : "ous",
		      "aliti" : "al",
		      "iviti" : "ive",
		      "biliti" : "ble",
		      "logi" : "log"
		    },

		    step3list = {
		      "icate" : "ic",
		      "ative" : "",
		      "alize" : "al",
		      "iciti" : "ic",
		      "ical" : "ic",
		      "ful" : "",
		      "ness" : ""
		    },

		    c = "[^aeiou]",          // consonant
		    v = "[aeiouy]",          // vowel
		    C = c + "[^aeiouy]*",    // consonant sequence
		    V = v + "[aeiou]*",      // vowel sequence

		    mgr0 = "^(" + C + ")?" + V + C,               // [C]VC... is m>0
		    meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$",  // [C]VC[V] is m=1
		    mgr1 = "^(" + C + ")?" + V + C + V + C,       // [C]VCVC... is m>1
		    s_v = "^(" + C + ")?" + v;                   // vowel in stem

		  var re_mgr0 = new RegExp(mgr0);
		  var re_mgr1 = new RegExp(mgr1);
		  var re_meq1 = new RegExp(meq1);
		  var re_s_v = new RegExp(s_v);

		  var re_1a = /^(.+?)(ss|i)es$/;
		  var re2_1a = /^(.+?)([^s])s$/;
		  var re_1b = /^(.+?)eed$/;
		  var re2_1b = /^(.+?)(ed|ing)$/;
		  var re_1b_2 = /.$/;
		  var re2_1b_2 = /(at|bl|iz)$/;
		  var re3_1b_2 = new RegExp("([^aeiouylsz])\\1$");
		  var re4_1b_2 = new RegExp("^" + C + v + "[^aeiouwxy]$");

		  var re_1c = /^(.+?[^aeiou])y$/;
		  var re_2 = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;

		  var re_3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;

		  var re_4 = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
		  var re2_4 = /^(.+?)(s|t)(ion)$/;

		  var re_5 = /^(.+?)e$/;
		  var re_5_1 = /ll$/;
		  var re3_5 = new RegExp("^" + C + v + "[^aeiouwxy]$");

		  var porterStemmer = function porterStemmer(w) {
		    var stem,
		      suffix,
		      firstch,
		      re,
		      re2,
		      re3,
		      re4;

		    if (w.length < 3) { return w; }

		    firstch = w.substr(0,1);
		    if (firstch == "y") {
		      w = firstch.toUpperCase() + w.substr(1);
		    }

		    // Step 1a
		    re = re_1a;
		    re2 = re2_1a;

		    if (re.test(w)) { w = w.replace(re,"$1$2"); }
		    else if (re2.test(w)) { w = w.replace(re2,"$1$2"); }

		    // Step 1b
		    re = re_1b;
		    re2 = re2_1b;
		    if (re.test(w)) {
		      var fp = re.exec(w);
		      re = re_mgr0;
		      if (re.test(fp[1])) {
		        re = re_1b_2;
		        w = w.replace(re,"");
		      }
		    } else if (re2.test(w)) {
		      var fp = re2.exec(w);
		      stem = fp[1];
		      re2 = re_s_v;
		      if (re2.test(stem)) {
		        w = stem;
		        re2 = re2_1b_2;
		        re3 = re3_1b_2;
		        re4 = re4_1b_2;
		        if (re2.test(w)) { w = w + "e"; }
		        else if (re3.test(w)) { re = re_1b_2; w = w.replace(re,""); }
		        else if (re4.test(w)) { w = w + "e"; }
		      }
		    }

		    // Step 1c - replace suffix y or Y by i if preceded by a non-vowel which is not the first letter of the word (so cry -> cri, by -> by, say -> say)
		    re = re_1c;
		    if (re.test(w)) {
		      var fp = re.exec(w);
		      stem = fp[1];
		      w = stem + "i";
		    }

		    // Step 2
		    re = re_2;
		    if (re.test(w)) {
		      var fp = re.exec(w);
		      stem = fp[1];
		      suffix = fp[2];
		      re = re_mgr0;
		      if (re.test(stem)) {
		        w = stem + step2list[suffix];
		      }
		    }

		    // Step 3
		    re = re_3;
		    if (re.test(w)) {
		      var fp = re.exec(w);
		      stem = fp[1];
		      suffix = fp[2];
		      re = re_mgr0;
		      if (re.test(stem)) {
		        w = stem + step3list[suffix];
		      }
		    }

		    // Step 4
		    re = re_4;
		    re2 = re2_4;
		    if (re.test(w)) {
		      var fp = re.exec(w);
		      stem = fp[1];
		      re = re_mgr1;
		      if (re.test(stem)) {
		        w = stem;
		      }
		    } else if (re2.test(w)) {
		      var fp = re2.exec(w);
		      stem = fp[1] + fp[2];
		      re2 = re_mgr1;
		      if (re2.test(stem)) {
		        w = stem;
		      }
		    }

		    // Step 5
		    re = re_5;
		    if (re.test(w)) {
		      var fp = re.exec(w);
		      stem = fp[1];
		      re = re_mgr1;
		      re2 = re_meq1;
		      re3 = re3_5;
		      if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
		        w = stem;
		      }
		    }

		    re = re_5_1;
		    re2 = re_mgr1;
		    if (re.test(w) && re2.test(w)) {
		      re = re_1b_2;
		      w = w.replace(re,"");
		    }

		    // and turn initial Y back to y

		    if (firstch == "y") {
		      w = firstch.toLowerCase() + w.substr(1);
		    }

		    return w;
		  };

		  return function (token) {
		    return token.update(porterStemmer);
		  }
		})();

		lunr.Pipeline.registerFunction(lunr.stemmer, 'stemmer');
		/*!
		 * lunr.stopWordFilter
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * lunr.generateStopWordFilter builds a stopWordFilter function from the provided
		 * list of stop words.
		 *
		 * The built in lunr.stopWordFilter is built using this generator and can be used
		 * to generate custom stopWordFilters for applications or non English languages.
		 *
		 * @function
		 * @param {Array} token The token to pass through the filter
		 * @returns {lunr.PipelineFunction}
		 * @see lunr.Pipeline
		 * @see lunr.stopWordFilter
		 */
		lunr.generateStopWordFilter = function (stopWords) {
		  var words = stopWords.reduce(function (memo, stopWord) {
		    memo[stopWord] = stopWord;
		    return memo
		  }, {});

		  return function (token) {
		    if (token && words[token.toString()] !== token.toString()) return token
		  }
		};

		/**
		 * lunr.stopWordFilter is an English language stop word list filter, any words
		 * contained in the list will not be passed through the filter.
		 *
		 * This is intended to be used in the Pipeline. If the token does not pass the
		 * filter then undefined will be returned.
		 *
		 * @function
		 * @implements {lunr.PipelineFunction}
		 * @params {lunr.Token} token - A token to check for being a stop word.
		 * @returns {lunr.Token}
		 * @see {@link lunr.Pipeline}
		 */
		lunr.stopWordFilter = lunr.generateStopWordFilter([
		  'a',
		  'able',
		  'about',
		  'across',
		  'after',
		  'all',
		  'almost',
		  'also',
		  'am',
		  'among',
		  'an',
		  'and',
		  'any',
		  'are',
		  'as',
		  'at',
		  'be',
		  'because',
		  'been',
		  'but',
		  'by',
		  'can',
		  'cannot',
		  'could',
		  'dear',
		  'did',
		  'do',
		  'does',
		  'either',
		  'else',
		  'ever',
		  'every',
		  'for',
		  'from',
		  'get',
		  'got',
		  'had',
		  'has',
		  'have',
		  'he',
		  'her',
		  'hers',
		  'him',
		  'his',
		  'how',
		  'however',
		  'i',
		  'if',
		  'in',
		  'into',
		  'is',
		  'it',
		  'its',
		  'just',
		  'least',
		  'let',
		  'like',
		  'likely',
		  'may',
		  'me',
		  'might',
		  'most',
		  'must',
		  'my',
		  'neither',
		  'no',
		  'nor',
		  'not',
		  'of',
		  'off',
		  'often',
		  'on',
		  'only',
		  'or',
		  'other',
		  'our',
		  'own',
		  'rather',
		  'said',
		  'say',
		  'says',
		  'she',
		  'should',
		  'since',
		  'so',
		  'some',
		  'than',
		  'that',
		  'the',
		  'their',
		  'them',
		  'then',
		  'there',
		  'these',
		  'they',
		  'this',
		  'tis',
		  'to',
		  'too',
		  'twas',
		  'us',
		  'wants',
		  'was',
		  'we',
		  'were',
		  'what',
		  'when',
		  'where',
		  'which',
		  'while',
		  'who',
		  'whom',
		  'why',
		  'will',
		  'with',
		  'would',
		  'yet',
		  'you',
		  'your'
		]);

		lunr.Pipeline.registerFunction(lunr.stopWordFilter, 'stopWordFilter');
		/*!
		 * lunr.trimmer
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * lunr.trimmer is a pipeline function for trimming non word
		 * characters from the beginning and end of tokens before they
		 * enter the index.
		 *
		 * This implementation may not work correctly for non latin
		 * characters and should either be removed or adapted for use
		 * with languages with non-latin characters.
		 *
		 * @static
		 * @implements {lunr.PipelineFunction}
		 * @param {lunr.Token} token The token to pass through the filter
		 * @returns {lunr.Token}
		 * @see lunr.Pipeline
		 */
		lunr.trimmer = function (token) {
		  return token.update(function (s) {
		    return s.replace(/^\W+/, '').replace(/\W+$/, '')
		  })
		};

		lunr.Pipeline.registerFunction(lunr.trimmer, 'trimmer');
		/*!
		 * lunr.TokenSet
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * A token set is used to store the unique list of all tokens
		 * within an index. Token sets are also used to represent an
		 * incoming query to the index, this query token set and index
		 * token set are then intersected to find which tokens to look
		 * up in the inverted index.
		 *
		 * A token set can hold multiple tokens, as in the case of the
		 * index token set, or it can hold a single token as in the
		 * case of a simple query token set.
		 *
		 * Additionally token sets are used to perform wildcard matching.
		 * Leading, contained and trailing wildcards are supported, and
		 * from this edit distance matching can also be provided.
		 *
		 * Token sets are implemented as a minimal finite state automata,
		 * where both common prefixes and suffixes are shared between tokens.
		 * This helps to reduce the space used for storing the token set.
		 *
		 * @constructor
		 */
		lunr.TokenSet = function () {
		  this.final = false;
		  this.edges = {};
		  this.id = lunr.TokenSet._nextId;
		  lunr.TokenSet._nextId += 1;
		};

		/**
		 * Keeps track of the next, auto increment, identifier to assign
		 * to a new tokenSet.
		 *
		 * TokenSets require a unique identifier to be correctly minimised.
		 *
		 * @private
		 */
		lunr.TokenSet._nextId = 1;

		/**
		 * Creates a TokenSet instance from the given sorted array of words.
		 *
		 * @param {String[]} arr - A sorted array of strings to create the set from.
		 * @returns {lunr.TokenSet}
		 * @throws Will throw an error if the input array is not sorted.
		 */
		lunr.TokenSet.fromArray = function (arr) {
		  var builder = new lunr.TokenSet.Builder;

		  for (var i = 0, len = arr.length; i < len; i++) {
		    builder.insert(arr[i]);
		  }

		  builder.finish();
		  return builder.root
		};

		/**
		 * Creates a token set from a query clause.
		 *
		 * @private
		 * @param {Object} clause - A single clause from lunr.Query.
		 * @param {string} clause.term - The query clause term.
		 * @param {number} [clause.editDistance] - The optional edit distance for the term.
		 * @returns {lunr.TokenSet}
		 */
		lunr.TokenSet.fromClause = function (clause) {
		  if ('editDistance' in clause) {
		    return lunr.TokenSet.fromFuzzyString(clause.term, clause.editDistance)
		  } else {
		    return lunr.TokenSet.fromString(clause.term)
		  }
		};

		/**
		 * Creates a token set representing a single string with a specified
		 * edit distance.
		 *
		 * Insertions, deletions, substitutions and transpositions are each
		 * treated as an edit distance of 1.
		 *
		 * Increasing the allowed edit distance will have a dramatic impact
		 * on the performance of both creating and intersecting these TokenSets.
		 * It is advised to keep the edit distance less than 3.
		 *
		 * @param {string} str - The string to create the token set from.
		 * @param {number} editDistance - The allowed edit distance to match.
		 * @returns {lunr.Vector}
		 */
		lunr.TokenSet.fromFuzzyString = function (str, editDistance) {
		  var root = new lunr.TokenSet;

		  var stack = [{
		    node: root,
		    editsRemaining: editDistance,
		    str: str
		  }];

		  while (stack.length) {
		    var frame = stack.pop();

		    // no edit
		    if (frame.str.length > 0) {
		      var char = frame.str.charAt(0),
		          noEditNode;

		      if (char in frame.node.edges) {
		        noEditNode = frame.node.edges[char];
		      } else {
		        noEditNode = new lunr.TokenSet;
		        frame.node.edges[char] = noEditNode;
		      }

		      if (frame.str.length == 1) {
		        noEditNode.final = true;
		      }

		      stack.push({
		        node: noEditNode,
		        editsRemaining: frame.editsRemaining,
		        str: frame.str.slice(1)
		      });
		    }

		    if (frame.editsRemaining == 0) {
		      continue
		    }

		    // insertion
		    if ("*" in frame.node.edges) {
		      var insertionNode = frame.node.edges["*"];
		    } else {
		      var insertionNode = new lunr.TokenSet;
		      frame.node.edges["*"] = insertionNode;
		    }

		    if (frame.str.length == 0) {
		      insertionNode.final = true;
		    }

		    stack.push({
		      node: insertionNode,
		      editsRemaining: frame.editsRemaining - 1,
		      str: frame.str
		    });

		    // deletion
		    // can only do a deletion if we have enough edits remaining
		    // and if there are characters left to delete in the string
		    if (frame.str.length > 1) {
		      stack.push({
		        node: frame.node,
		        editsRemaining: frame.editsRemaining - 1,
		        str: frame.str.slice(1)
		      });
		    }

		    // deletion
		    // just removing the last character from the str
		    if (frame.str.length == 1) {
		      frame.node.final = true;
		    }

		    // substitution
		    // can only do a substitution if we have enough edits remaining
		    // and if there are characters left to substitute
		    if (frame.str.length >= 1) {
		      if ("*" in frame.node.edges) {
		        var substitutionNode = frame.node.edges["*"];
		      } else {
		        var substitutionNode = new lunr.TokenSet;
		        frame.node.edges["*"] = substitutionNode;
		      }

		      if (frame.str.length == 1) {
		        substitutionNode.final = true;
		      }

		      stack.push({
		        node: substitutionNode,
		        editsRemaining: frame.editsRemaining - 1,
		        str: frame.str.slice(1)
		      });
		    }

		    // transposition
		    // can only do a transposition if there are edits remaining
		    // and there are enough characters to transpose
		    if (frame.str.length > 1) {
		      var charA = frame.str.charAt(0),
		          charB = frame.str.charAt(1),
		          transposeNode;

		      if (charB in frame.node.edges) {
		        transposeNode = frame.node.edges[charB];
		      } else {
		        transposeNode = new lunr.TokenSet;
		        frame.node.edges[charB] = transposeNode;
		      }

		      if (frame.str.length == 1) {
		        transposeNode.final = true;
		      }

		      stack.push({
		        node: transposeNode,
		        editsRemaining: frame.editsRemaining - 1,
		        str: charA + frame.str.slice(2)
		      });
		    }
		  }

		  return root
		};

		/**
		 * Creates a TokenSet from a string.
		 *
		 * The string may contain one or more wildcard characters (*)
		 * that will allow wildcard matching when intersecting with
		 * another TokenSet.
		 *
		 * @param {string} str - The string to create a TokenSet from.
		 * @returns {lunr.TokenSet}
		 */
		lunr.TokenSet.fromString = function (str) {
		  var node = new lunr.TokenSet,
		      root = node;

		  /*
		   * Iterates through all characters within the passed string
		   * appending a node for each character.
		   *
		   * When a wildcard character is found then a self
		   * referencing edge is introduced to continually match
		   * any number of any characters.
		   */
		  for (var i = 0, len = str.length; i < len; i++) {
		    var char = str[i],
		        final = (i == len - 1);

		    if (char == "*") {
		      node.edges[char] = node;
		      node.final = final;

		    } else {
		      var next = new lunr.TokenSet;
		      next.final = final;

		      node.edges[char] = next;
		      node = next;
		    }
		  }

		  return root
		};

		/**
		 * Converts this TokenSet into an array of strings
		 * contained within the TokenSet.
		 *
		 * This is not intended to be used on a TokenSet that
		 * contains wildcards, in these cases the results are
		 * undefined and are likely to cause an infinite loop.
		 *
		 * @returns {string[]}
		 */
		lunr.TokenSet.prototype.toArray = function () {
		  var words = [];

		  var stack = [{
		    prefix: "",
		    node: this
		  }];

		  while (stack.length) {
		    var frame = stack.pop(),
		        edges = Object.keys(frame.node.edges),
		        len = edges.length;

		    if (frame.node.final) {
		      /* In Safari, at this point the prefix is sometimes corrupted, see:
		       * https://github.com/olivernn/lunr.js/issues/279 Calling any
		       * String.prototype method forces Safari to "cast" this string to what
		       * it's supposed to be, fixing the bug. */
		      frame.prefix.charAt(0);
		      words.push(frame.prefix);
		    }

		    for (var i = 0; i < len; i++) {
		      var edge = edges[i];

		      stack.push({
		        prefix: frame.prefix.concat(edge),
		        node: frame.node.edges[edge]
		      });
		    }
		  }

		  return words
		};

		/**
		 * Generates a string representation of a TokenSet.
		 *
		 * This is intended to allow TokenSets to be used as keys
		 * in objects, largely to aid the construction and minimisation
		 * of a TokenSet. As such it is not designed to be a human
		 * friendly representation of the TokenSet.
		 *
		 * @returns {string}
		 */
		lunr.TokenSet.prototype.toString = function () {
		  // NOTE: Using Object.keys here as this.edges is very likely
		  // to enter 'hash-mode' with many keys being added
		  //
		  // avoiding a for-in loop here as it leads to the function
		  // being de-optimised (at least in V8). From some simple
		  // benchmarks the performance is comparable, but allowing
		  // V8 to optimize may mean easy performance wins in the future.

		  if (this._str) {
		    return this._str
		  }

		  var str = this.final ? '1' : '0',
		      labels = Object.keys(this.edges).sort(),
		      len = labels.length;

		  for (var i = 0; i < len; i++) {
		    var label = labels[i],
		        node = this.edges[label];

		    str = str + label + node.id;
		  }

		  return str
		};

		/**
		 * Returns a new TokenSet that is the intersection of
		 * this TokenSet and the passed TokenSet.
		 *
		 * This intersection will take into account any wildcards
		 * contained within the TokenSet.
		 *
		 * @param {lunr.TokenSet} b - An other TokenSet to intersect with.
		 * @returns {lunr.TokenSet}
		 */
		lunr.TokenSet.prototype.intersect = function (b) {
		  var output = new lunr.TokenSet,
		      frame = undefined;

		  var stack = [{
		    qNode: b,
		    output: output,
		    node: this
		  }];

		  while (stack.length) {
		    frame = stack.pop();

		    // NOTE: As with the #toString method, we are using
		    // Object.keys and a for loop instead of a for-in loop
		    // as both of these objects enter 'hash' mode, causing
		    // the function to be de-optimised in V8
		    var qEdges = Object.keys(frame.qNode.edges),
		        qLen = qEdges.length,
		        nEdges = Object.keys(frame.node.edges),
		        nLen = nEdges.length;

		    for (var q = 0; q < qLen; q++) {
		      var qEdge = qEdges[q];

		      for (var n = 0; n < nLen; n++) {
		        var nEdge = nEdges[n];

		        if (nEdge == qEdge || qEdge == '*') {
		          var node = frame.node.edges[nEdge],
		              qNode = frame.qNode.edges[qEdge],
		              final = node.final && qNode.final,
		              next = undefined;

		          if (nEdge in frame.output.edges) {
		            // an edge already exists for this character
		            // no need to create a new node, just set the finality
		            // bit unless this node is already final
		            next = frame.output.edges[nEdge];
		            next.final = next.final || final;

		          } else {
		            // no edge exists yet, must create one
		            // set the finality bit and insert it
		            // into the output
		            next = new lunr.TokenSet;
		            next.final = final;
		            frame.output.edges[nEdge] = next;
		          }

		          stack.push({
		            qNode: qNode,
		            output: next,
		            node: node
		          });
		        }
		      }
		    }
		  }

		  return output
		};
		lunr.TokenSet.Builder = function () {
		  this.previousWord = "";
		  this.root = new lunr.TokenSet;
		  this.uncheckedNodes = [];
		  this.minimizedNodes = {};
		};

		lunr.TokenSet.Builder.prototype.insert = function (word) {
		  var node,
		      commonPrefix = 0;

		  if (word < this.previousWord) {
		    throw new Error ("Out of order word insertion")
		  }

		  for (var i = 0; i < word.length && i < this.previousWord.length; i++) {
		    if (word[i] != this.previousWord[i]) break
		    commonPrefix++;
		  }

		  this.minimize(commonPrefix);

		  if (this.uncheckedNodes.length == 0) {
		    node = this.root;
		  } else {
		    node = this.uncheckedNodes[this.uncheckedNodes.length - 1].child;
		  }

		  for (var i = commonPrefix; i < word.length; i++) {
		    var nextNode = new lunr.TokenSet,
		        char = word[i];

		    node.edges[char] = nextNode;

		    this.uncheckedNodes.push({
		      parent: node,
		      char: char,
		      child: nextNode
		    });

		    node = nextNode;
		  }

		  node.final = true;
		  this.previousWord = word;
		};

		lunr.TokenSet.Builder.prototype.finish = function () {
		  this.minimize(0);
		};

		lunr.TokenSet.Builder.prototype.minimize = function (downTo) {
		  for (var i = this.uncheckedNodes.length - 1; i >= downTo; i--) {
		    var node = this.uncheckedNodes[i],
		        childKey = node.child.toString();

		    if (childKey in this.minimizedNodes) {
		      node.parent.edges[node.char] = this.minimizedNodes[childKey];
		    } else {
		      // Cache the key for this node since
		      // we know it can't change anymore
		      node.child._str = childKey;

		      this.minimizedNodes[childKey] = node.child;
		    }

		    this.uncheckedNodes.pop();
		  }
		};
		/*!
		 * lunr.Index
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * An index contains the built index of all documents and provides a query interface
		 * to the index.
		 *
		 * Usually instances of lunr.Index will not be created using this constructor, instead
		 * lunr.Builder should be used to construct new indexes, or lunr.Index.load should be
		 * used to load previously built and serialized indexes.
		 *
		 * @constructor
		 * @param {Object} attrs - The attributes of the built search index.
		 * @param {Object} attrs.invertedIndex - An index of term/field to document reference.
		 * @param {Object<string, lunr.Vector>} attrs.fieldVectors - Field vectors
		 * @param {lunr.TokenSet} attrs.tokenSet - An set of all corpus tokens.
		 * @param {string[]} attrs.fields - The names of indexed document fields.
		 * @param {lunr.Pipeline} attrs.pipeline - The pipeline to use for search terms.
		 */
		lunr.Index = function (attrs) {
		  this.invertedIndex = attrs.invertedIndex;
		  this.fieldVectors = attrs.fieldVectors;
		  this.tokenSet = attrs.tokenSet;
		  this.fields = attrs.fields;
		  this.pipeline = attrs.pipeline;
		};

		/**
		 * A result contains details of a document matching a search query.
		 * @typedef {Object} lunr.Index~Result
		 * @property {string} ref - The reference of the document this result represents.
		 * @property {number} score - A number between 0 and 1 representing how similar this document is to the query.
		 * @property {lunr.MatchData} matchData - Contains metadata about this match including which term(s) caused the match.
		 */

		/**
		 * Although lunr provides the ability to create queries using lunr.Query, it also provides a simple
		 * query language which itself is parsed into an instance of lunr.Query.
		 *
		 * For programmatically building queries it is advised to directly use lunr.Query, the query language
		 * is best used for human entered text rather than program generated text.
		 *
		 * At its simplest queries can just be a single term, e.g. `hello`, multiple terms are also supported
		 * and will be combined with OR, e.g `hello world` will match documents that contain either 'hello'
		 * or 'world', though those that contain both will rank higher in the results.
		 *
		 * Wildcards can be included in terms to match one or more unspecified characters, these wildcards can
		 * be inserted anywhere within the term, and more than one wildcard can exist in a single term. Adding
		 * wildcards will increase the number of documents that will be found but can also have a negative
		 * impact on query performance, especially with wildcards at the beginning of a term.
		 *
		 * Terms can be restricted to specific fields, e.g. `title:hello`, only documents with the term
		 * hello in the title field will match this query. Using a field not present in the index will lead
		 * to an error being thrown.
		 *
		 * Modifiers can also be added to terms, lunr supports edit distance and boost modifiers on terms. A term
		 * boost will make documents matching that term score higher, e.g. `foo^5`. Edit distance is also supported
		 * to provide fuzzy matching, e.g. 'hello~2' will match documents with hello with an edit distance of 2.
		 * Avoid large values for edit distance to improve query performance.
		 *
		 * Each term also supports a presence modifier. By default a term's presence in document is optional, however
		 * this can be changed to either required or prohibited. For a term's presence to be required in a document the
		 * term should be prefixed with a '+', e.g. `+foo bar` is a search for documents that must contain 'foo' and
		 * optionally contain 'bar'. Conversely a leading '-' sets the terms presence to prohibited, i.e. it must not
		 * appear in a document, e.g. `-foo bar` is a search for documents that do not contain 'foo' but may contain 'bar'.
		 *
		 * To escape special characters the backslash character '\' can be used, this allows searches to include
		 * characters that would normally be considered modifiers, e.g. `foo\~2` will search for a term "foo~2" instead
		 * of attempting to apply a boost of 2 to the search term "foo".
		 *
		 * @typedef {string} lunr.Index~QueryString
		 * @example <caption>Simple single term query</caption>
		 * hello
		 * @example <caption>Multiple term query</caption>
		 * hello world
		 * @example <caption>term scoped to a field</caption>
		 * title:hello
		 * @example <caption>term with a boost of 10</caption>
		 * hello^10
		 * @example <caption>term with an edit distance of 2</caption>
		 * hello~2
		 * @example <caption>terms with presence modifiers</caption>
		 * -foo +bar baz
		 */

		/**
		 * Performs a search against the index using lunr query syntax.
		 *
		 * Results will be returned sorted by their score, the most relevant results
		 * will be returned first.  For details on how the score is calculated, please see
		 * the {@link https://lunrjs.com/guides/searching.html#scoring|guide}.
		 *
		 * For more programmatic querying use lunr.Index#query.
		 *
		 * @param {lunr.Index~QueryString} queryString - A string containing a lunr query.
		 * @throws {lunr.QueryParseError} If the passed query string cannot be parsed.
		 * @returns {lunr.Index~Result[]}
		 */
		lunr.Index.prototype.search = function (queryString) {
		  return this.query(function (query) {
		    var parser = new lunr.QueryParser(queryString, query);
		    parser.parse();
		  })
		};

		/**
		 * A query builder callback provides a query object to be used to express
		 * the query to perform on the index.
		 *
		 * @callback lunr.Index~queryBuilder
		 * @param {lunr.Query} query - The query object to build up.
		 * @this lunr.Query
		 */

		/**
		 * Performs a query against the index using the yielded lunr.Query object.
		 *
		 * If performing programmatic queries against the index, this method is preferred
		 * over lunr.Index#search so as to avoid the additional query parsing overhead.
		 *
		 * A query object is yielded to the supplied function which should be used to
		 * express the query to be run against the index.
		 *
		 * Note that although this function takes a callback parameter it is _not_ an
		 * asynchronous operation, the callback is just yielded a query object to be
		 * customized.
		 *
		 * @param {lunr.Index~queryBuilder} fn - A function that is used to build the query.
		 * @returns {lunr.Index~Result[]}
		 */
		lunr.Index.prototype.query = function (fn) {
		  // for each query clause
		  // * process terms
		  // * expand terms from token set
		  // * find matching documents and metadata
		  // * get document vectors
		  // * score documents

		  var query = new lunr.Query(this.fields),
		      matchingFields = Object.create(null),
		      queryVectors = Object.create(null),
		      termFieldCache = Object.create(null),
		      requiredMatches = Object.create(null),
		      prohibitedMatches = Object.create(null);

		  /*
		   * To support field level boosts a query vector is created per
		   * field. An empty vector is eagerly created to support negated
		   * queries.
		   */
		  for (var i = 0; i < this.fields.length; i++) {
		    queryVectors[this.fields[i]] = new lunr.Vector;
		  }

		  fn.call(query, query);

		  for (var i = 0; i < query.clauses.length; i++) {
		    /*
		     * Unless the pipeline has been disabled for this term, which is
		     * the case for terms with wildcards, we need to pass the clause
		     * term through the search pipeline. A pipeline returns an array
		     * of processed terms. Pipeline functions may expand the passed
		     * term, which means we may end up performing multiple index lookups
		     * for a single query term.
		     */
		    var clause = query.clauses[i],
		        terms = null,
		        clauseMatches = lunr.Set.empty;

		    if (clause.usePipeline) {
		      terms = this.pipeline.runString(clause.term, {
		        fields: clause.fields
		      });
		    } else {
		      terms = [clause.term];
		    }

		    for (var m = 0; m < terms.length; m++) {
		      var term = terms[m];

		      /*
		       * Each term returned from the pipeline needs to use the same query
		       * clause object, e.g. the same boost and or edit distance. The
		       * simplest way to do this is to re-use the clause object but mutate
		       * its term property.
		       */
		      clause.term = term;

		      /*
		       * From the term in the clause we create a token set which will then
		       * be used to intersect the indexes token set to get a list of terms
		       * to lookup in the inverted index
		       */
		      var termTokenSet = lunr.TokenSet.fromClause(clause),
		          expandedTerms = this.tokenSet.intersect(termTokenSet).toArray();

		      /*
		       * If a term marked as required does not exist in the tokenSet it is
		       * impossible for the search to return any matches. We set all the field
		       * scoped required matches set to empty and stop examining any further
		       * clauses.
		       */
		      if (expandedTerms.length === 0 && clause.presence === lunr.Query.presence.REQUIRED) {
		        for (var k = 0; k < clause.fields.length; k++) {
		          var field = clause.fields[k];
		          requiredMatches[field] = lunr.Set.empty;
		        }

		        break
		      }

		      for (var j = 0; j < expandedTerms.length; j++) {
		        /*
		         * For each term get the posting and termIndex, this is required for
		         * building the query vector.
		         */
		        var expandedTerm = expandedTerms[j],
		            posting = this.invertedIndex[expandedTerm],
		            termIndex = posting._index;

		        for (var k = 0; k < clause.fields.length; k++) {
		          /*
		           * For each field that this query term is scoped by (by default
		           * all fields are in scope) we need to get all the document refs
		           * that have this term in that field.
		           *
		           * The posting is the entry in the invertedIndex for the matching
		           * term from above.
		           */
		          var field = clause.fields[k],
		              fieldPosting = posting[field],
		              matchingDocumentRefs = Object.keys(fieldPosting),
		              termField = expandedTerm + "/" + field,
		              matchingDocumentsSet = new lunr.Set(matchingDocumentRefs);

		          /*
		           * if the presence of this term is required ensure that the matching
		           * documents are added to the set of required matches for this clause.
		           *
		           */
		          if (clause.presence == lunr.Query.presence.REQUIRED) {
		            clauseMatches = clauseMatches.union(matchingDocumentsSet);

		            if (requiredMatches[field] === undefined) {
		              requiredMatches[field] = lunr.Set.complete;
		            }
		          }

		          /*
		           * if the presence of this term is prohibited ensure that the matching
		           * documents are added to the set of prohibited matches for this field,
		           * creating that set if it does not yet exist.
		           */
		          if (clause.presence == lunr.Query.presence.PROHIBITED) {
		            if (prohibitedMatches[field] === undefined) {
		              prohibitedMatches[field] = lunr.Set.empty;
		            }

		            prohibitedMatches[field] = prohibitedMatches[field].union(matchingDocumentsSet);

		            /*
		             * Prohibited matches should not be part of the query vector used for
		             * similarity scoring and no metadata should be extracted so we continue
		             * to the next field
		             */
		            continue
		          }

		          /*
		           * The query field vector is populated using the termIndex found for
		           * the term and a unit value with the appropriate boost applied.
		           * Using upsert because there could already be an entry in the vector
		           * for the term we are working with. In that case we just add the scores
		           * together.
		           */
		          queryVectors[field].upsert(termIndex, clause.boost, function (a, b) { return a + b });

		          /**
		           * If we've already seen this term, field combo then we've already collected
		           * the matching documents and metadata, no need to go through all that again
		           */
		          if (termFieldCache[termField]) {
		            continue
		          }

		          for (var l = 0; l < matchingDocumentRefs.length; l++) {
		            /*
		             * All metadata for this term/field/document triple
		             * are then extracted and collected into an instance
		             * of lunr.MatchData ready to be returned in the query
		             * results
		             */
		            var matchingDocumentRef = matchingDocumentRefs[l],
		                matchingFieldRef = new lunr.FieldRef (matchingDocumentRef, field),
		                metadata = fieldPosting[matchingDocumentRef],
		                fieldMatch;

		            if ((fieldMatch = matchingFields[matchingFieldRef]) === undefined) {
		              matchingFields[matchingFieldRef] = new lunr.MatchData (expandedTerm, field, metadata);
		            } else {
		              fieldMatch.add(expandedTerm, field, metadata);
		            }

		          }

		          termFieldCache[termField] = true;
		        }
		      }
		    }

		    /**
		     * If the presence was required we need to update the requiredMatches field sets.
		     * We do this after all fields for the term have collected their matches because
		     * the clause terms presence is required in _any_ of the fields not _all_ of the
		     * fields.
		     */
		    if (clause.presence === lunr.Query.presence.REQUIRED) {
		      for (var k = 0; k < clause.fields.length; k++) {
		        var field = clause.fields[k];
		        requiredMatches[field] = requiredMatches[field].intersect(clauseMatches);
		      }
		    }
		  }

		  /**
		   * Need to combine the field scoped required and prohibited
		   * matching documents into a global set of required and prohibited
		   * matches
		   */
		  var allRequiredMatches = lunr.Set.complete,
		      allProhibitedMatches = lunr.Set.empty;

		  for (var i = 0; i < this.fields.length; i++) {
		    var field = this.fields[i];

		    if (requiredMatches[field]) {
		      allRequiredMatches = allRequiredMatches.intersect(requiredMatches[field]);
		    }

		    if (prohibitedMatches[field]) {
		      allProhibitedMatches = allProhibitedMatches.union(prohibitedMatches[field]);
		    }
		  }

		  var matchingFieldRefs = Object.keys(matchingFields),
		      results = [],
		      matches = Object.create(null);

		  /*
		   * If the query is negated (contains only prohibited terms)
		   * we need to get _all_ fieldRefs currently existing in the
		   * index. This is only done when we know that the query is
		   * entirely prohibited terms to avoid any cost of getting all
		   * fieldRefs unnecessarily.
		   *
		   * Additionally, blank MatchData must be created to correctly
		   * populate the results.
		   */
		  if (query.isNegated()) {
		    matchingFieldRefs = Object.keys(this.fieldVectors);

		    for (var i = 0; i < matchingFieldRefs.length; i++) {
		      var matchingFieldRef = matchingFieldRefs[i];
		      var fieldRef = lunr.FieldRef.fromString(matchingFieldRef);
		      matchingFields[matchingFieldRef] = new lunr.MatchData;
		    }
		  }

		  for (var i = 0; i < matchingFieldRefs.length; i++) {
		    /*
		     * Currently we have document fields that match the query, but we
		     * need to return documents. The matchData and scores are combined
		     * from multiple fields belonging to the same document.
		     *
		     * Scores are calculated by field, using the query vectors created
		     * above, and combined into a final document score using addition.
		     */
		    var fieldRef = lunr.FieldRef.fromString(matchingFieldRefs[i]),
		        docRef = fieldRef.docRef;

		    if (!allRequiredMatches.contains(docRef)) {
		      continue
		    }

		    if (allProhibitedMatches.contains(docRef)) {
		      continue
		    }

		    var fieldVector = this.fieldVectors[fieldRef],
		        score = queryVectors[fieldRef.fieldName].similarity(fieldVector),
		        docMatch;

		    if ((docMatch = matches[docRef]) !== undefined) {
		      docMatch.score += score;
		      docMatch.matchData.combine(matchingFields[fieldRef]);
		    } else {
		      var match = {
		        ref: docRef,
		        score: score,
		        matchData: matchingFields[fieldRef]
		      };
		      matches[docRef] = match;
		      results.push(match);
		    }
		  }

		  /*
		   * Sort the results objects by score, highest first.
		   */
		  return results.sort(function (a, b) {
		    return b.score - a.score
		  })
		};

		/**
		 * Prepares the index for JSON serialization.
		 *
		 * The schema for this JSON blob will be described in a
		 * separate JSON schema file.
		 *
		 * @returns {Object}
		 */
		lunr.Index.prototype.toJSON = function () {
		  var invertedIndex = Object.keys(this.invertedIndex)
		    .sort()
		    .map(function (term) {
		      return [term, this.invertedIndex[term]]
		    }, this);

		  var fieldVectors = Object.keys(this.fieldVectors)
		    .map(function (ref) {
		      return [ref, this.fieldVectors[ref].toJSON()]
		    }, this);

		  return {
		    version: lunr.version,
		    fields: this.fields,
		    fieldVectors: fieldVectors,
		    invertedIndex: invertedIndex,
		    pipeline: this.pipeline.toJSON()
		  }
		};

		/**
		 * Loads a previously serialized lunr.Index
		 *
		 * @param {Object} serializedIndex - A previously serialized lunr.Index
		 * @returns {lunr.Index}
		 */
		lunr.Index.load = function (serializedIndex) {
		  var attrs = {},
		      fieldVectors = {},
		      serializedVectors = serializedIndex.fieldVectors,
		      invertedIndex = Object.create(null),
		      serializedInvertedIndex = serializedIndex.invertedIndex,
		      tokenSetBuilder = new lunr.TokenSet.Builder,
		      pipeline = lunr.Pipeline.load(serializedIndex.pipeline);

		  if (serializedIndex.version != lunr.version) {
		    lunr.utils.warn("Version mismatch when loading serialised index. Current version of lunr '" + lunr.version + "' does not match serialized index '" + serializedIndex.version + "'");
		  }

		  for (var i = 0; i < serializedVectors.length; i++) {
		    var tuple = serializedVectors[i],
		        ref = tuple[0],
		        elements = tuple[1];

		    fieldVectors[ref] = new lunr.Vector(elements);
		  }

		  for (var i = 0; i < serializedInvertedIndex.length; i++) {
		    var tuple = serializedInvertedIndex[i],
		        term = tuple[0],
		        posting = tuple[1];

		    tokenSetBuilder.insert(term);
		    invertedIndex[term] = posting;
		  }

		  tokenSetBuilder.finish();

		  attrs.fields = serializedIndex.fields;

		  attrs.fieldVectors = fieldVectors;
		  attrs.invertedIndex = invertedIndex;
		  attrs.tokenSet = tokenSetBuilder.root;
		  attrs.pipeline = pipeline;

		  return new lunr.Index(attrs)
		};
		/*!
		 * lunr.Builder
		 * Copyright (C) 2020 Oliver Nightingale
		 */

		/**
		 * lunr.Builder performs indexing on a set of documents and
		 * returns instances of lunr.Index ready for querying.
		 *
		 * All configuration of the index is done via the builder, the
		 * fields to index, the document reference, the text processing
		 * pipeline and document scoring parameters are all set on the
		 * builder before indexing.
		 *
		 * @constructor
		 * @property {string} _ref - Internal reference to the document reference field.
		 * @property {string[]} _fields - Internal reference to the document fields to index.
		 * @property {object} invertedIndex - The inverted index maps terms to document fields.
		 * @property {object} documentTermFrequencies - Keeps track of document term frequencies.
		 * @property {object} documentLengths - Keeps track of the length of documents added to the index.
		 * @property {lunr.tokenizer} tokenizer - Function for splitting strings into tokens for indexing.
		 * @property {lunr.Pipeline} pipeline - The pipeline performs text processing on tokens before indexing.
		 * @property {lunr.Pipeline} searchPipeline - A pipeline for processing search terms before querying the index.
		 * @property {number} documentCount - Keeps track of the total number of documents indexed.
		 * @property {number} _b - A parameter to control field length normalization, setting this to 0 disabled normalization, 1 fully normalizes field lengths, the default value is 0.75.
		 * @property {number} _k1 - A parameter to control how quickly an increase in term frequency results in term frequency saturation, the default value is 1.2.
		 * @property {number} termIndex - A counter incremented for each unique term, used to identify a terms position in the vector space.
		 * @property {array} metadataWhitelist - A list of metadata keys that have been whitelisted for entry in the index.
		 */
		lunr.Builder = function () {
		  this._ref = "id";
		  this._fields = Object.create(null);
		  this._documents = Object.create(null);
		  this.invertedIndex = Object.create(null);
		  this.fieldTermFrequencies = {};
		  this.fieldLengths = {};
		  this.tokenizer = lunr.tokenizer;
		  this.pipeline = new lunr.Pipeline;
		  this.searchPipeline = new lunr.Pipeline;
		  this.documentCount = 0;
		  this._b = 0.75;
		  this._k1 = 1.2;
		  this.termIndex = 0;
		  this.metadataWhitelist = [];
		};

		/**
		 * Sets the document field used as the document reference. Every document must have this field.
		 * The type of this field in the document should be a string, if it is not a string it will be
		 * coerced into a string by calling toString.
		 *
		 * The default ref is 'id'.
		 *
		 * The ref should _not_ be changed during indexing, it should be set before any documents are
		 * added to the index. Changing it during indexing can lead to inconsistent results.
		 *
		 * @param {string} ref - The name of the reference field in the document.
		 */
		lunr.Builder.prototype.ref = function (ref) {
		  this._ref = ref;
		};

		/**
		 * A function that is used to extract a field from a document.
		 *
		 * Lunr expects a field to be at the top level of a document, if however the field
		 * is deeply nested within a document an extractor function can be used to extract
		 * the right field for indexing.
		 *
		 * @callback fieldExtractor
		 * @param {object} doc - The document being added to the index.
		 * @returns {?(string|object|object[])} obj - The object that will be indexed for this field.
		 * @example <caption>Extracting a nested field</caption>
		 * function (doc) { return doc.nested.field }
		 */

		/**
		 * Adds a field to the list of document fields that will be indexed. Every document being
		 * indexed should have this field. Null values for this field in indexed documents will
		 * not cause errors but will limit the chance of that document being retrieved by searches.
		 *
		 * All fields should be added before adding documents to the index. Adding fields after
		 * a document has been indexed will have no effect on already indexed documents.
		 *
		 * Fields can be boosted at build time. This allows terms within that field to have more
		 * importance when ranking search results. Use a field boost to specify that matches within
		 * one field are more important than other fields.
		 *
		 * @param {string} fieldName - The name of a field to index in all documents.
		 * @param {object} attributes - Optional attributes associated with this field.
		 * @param {number} [attributes.boost=1] - Boost applied to all terms within this field.
		 * @param {fieldExtractor} [attributes.extractor] - Function to extract a field from a document.
		 * @throws {RangeError} fieldName cannot contain unsupported characters '/'
		 */
		lunr.Builder.prototype.field = function (fieldName, attributes) {
		  if (/\//.test(fieldName)) {
		    throw new RangeError ("Field '" + fieldName + "' contains illegal character '/'")
		  }

		  this._fields[fieldName] = attributes || {};
		};

		/**
		 * A parameter to tune the amount of field length normalisation that is applied when
		 * calculating relevance scores. A value of 0 will completely disable any normalisation
		 * and a value of 1 will fully normalise field lengths. The default is 0.75. Values of b
		 * will be clamped to the range 0 - 1.
		 *
		 * @param {number} number - The value to set for this tuning parameter.
		 */
		lunr.Builder.prototype.b = function (number) {
		  if (number < 0) {
		    this._b = 0;
		  } else if (number > 1) {
		    this._b = 1;
		  } else {
		    this._b = number;
		  }
		};

		/**
		 * A parameter that controls the speed at which a rise in term frequency results in term
		 * frequency saturation. The default value is 1.2. Setting this to a higher value will give
		 * slower saturation levels, a lower value will result in quicker saturation.
		 *
		 * @param {number} number - The value to set for this tuning parameter.
		 */
		lunr.Builder.prototype.k1 = function (number) {
		  this._k1 = number;
		};

		/**
		 * Adds a document to the index.
		 *
		 * Before adding fields to the index the index should have been fully setup, with the document
		 * ref and all fields to index already having been specified.
		 *
		 * The document must have a field name as specified by the ref (by default this is 'id') and
		 * it should have all fields defined for indexing, though null or undefined values will not
		 * cause errors.
		 *
		 * Entire documents can be boosted at build time. Applying a boost to a document indicates that
		 * this document should rank higher in search results than other documents.
		 *
		 * @param {object} doc - The document to add to the index.
		 * @param {object} attributes - Optional attributes associated with this document.
		 * @param {number} [attributes.boost=1] - Boost applied to all terms within this document.
		 */
		lunr.Builder.prototype.add = function (doc, attributes) {
		  var docRef = doc[this._ref],
		      fields = Object.keys(this._fields);

		  this._documents[docRef] = attributes || {};
		  this.documentCount += 1;

		  for (var i = 0; i < fields.length; i++) {
		    var fieldName = fields[i],
		        extractor = this._fields[fieldName].extractor,
		        field = extractor ? extractor(doc) : doc[fieldName],
		        tokens = this.tokenizer(field, {
		          fields: [fieldName]
		        }),
		        terms = this.pipeline.run(tokens),
		        fieldRef = new lunr.FieldRef (docRef, fieldName),
		        fieldTerms = Object.create(null);

		    this.fieldTermFrequencies[fieldRef] = fieldTerms;
		    this.fieldLengths[fieldRef] = 0;

		    // store the length of this field for this document
		    this.fieldLengths[fieldRef] += terms.length;

		    // calculate term frequencies for this field
		    for (var j = 0; j < terms.length; j++) {
		      var term = terms[j];

		      if (fieldTerms[term] == undefined) {
		        fieldTerms[term] = 0;
		      }

		      fieldTerms[term] += 1;

		      // add to inverted index
		      // create an initial posting if one doesn't exist
		      if (this.invertedIndex[term] == undefined) {
		        var posting = Object.create(null);
		        posting["_index"] = this.termIndex;
		        this.termIndex += 1;

		        for (var k = 0; k < fields.length; k++) {
		          posting[fields[k]] = Object.create(null);
		        }

		        this.invertedIndex[term] = posting;
		      }

		      // add an entry for this term/fieldName/docRef to the invertedIndex
		      if (this.invertedIndex[term][fieldName][docRef] == undefined) {
		        this.invertedIndex[term][fieldName][docRef] = Object.create(null);
		      }

		      // store all whitelisted metadata about this token in the
		      // inverted index
		      for (var l = 0; l < this.metadataWhitelist.length; l++) {
		        var metadataKey = this.metadataWhitelist[l],
		            metadata = term.metadata[metadataKey];

		        if (this.invertedIndex[term][fieldName][docRef][metadataKey] == undefined) {
		          this.invertedIndex[term][fieldName][docRef][metadataKey] = [];
		        }

		        this.invertedIndex[term][fieldName][docRef][metadataKey].push(metadata);
		      }
		    }

		  }
		};

		/**
		 * Calculates the average document length for this index
		 *
		 * @private
		 */
		lunr.Builder.prototype.calculateAverageFieldLengths = function () {

		  var fieldRefs = Object.keys(this.fieldLengths),
		      numberOfFields = fieldRefs.length,
		      accumulator = {},
		      documentsWithField = {};

		  for (var i = 0; i < numberOfFields; i++) {
		    var fieldRef = lunr.FieldRef.fromString(fieldRefs[i]),
		        field = fieldRef.fieldName;

		    documentsWithField[field] || (documentsWithField[field] = 0);
		    documentsWithField[field] += 1;

		    accumulator[field] || (accumulator[field] = 0);
		    accumulator[field] += this.fieldLengths[fieldRef];
		  }

		  var fields = Object.keys(this._fields);

		  for (var i = 0; i < fields.length; i++) {
		    var fieldName = fields[i];
		    accumulator[fieldName] = accumulator[fieldName] / documentsWithField[fieldName];
		  }

		  this.averageFieldLength = accumulator;
		};

		/**
		 * Builds a vector space model of every document using lunr.Vector
		 *
		 * @private
		 */
		lunr.Builder.prototype.createFieldVectors = function () {
		  var fieldVectors = {},
		      fieldRefs = Object.keys(this.fieldTermFrequencies),
		      fieldRefsLength = fieldRefs.length,
		      termIdfCache = Object.create(null);

		  for (var i = 0; i < fieldRefsLength; i++) {
		    var fieldRef = lunr.FieldRef.fromString(fieldRefs[i]),
		        fieldName = fieldRef.fieldName,
		        fieldLength = this.fieldLengths[fieldRef],
		        fieldVector = new lunr.Vector,
		        termFrequencies = this.fieldTermFrequencies[fieldRef],
		        terms = Object.keys(termFrequencies),
		        termsLength = terms.length;


		    var fieldBoost = this._fields[fieldName].boost || 1,
		        docBoost = this._documents[fieldRef.docRef].boost || 1;

		    for (var j = 0; j < termsLength; j++) {
		      var term = terms[j],
		          tf = termFrequencies[term],
		          termIndex = this.invertedIndex[term]._index,
		          idf, score, scoreWithPrecision;

		      if (termIdfCache[term] === undefined) {
		        idf = lunr.idf(this.invertedIndex[term], this.documentCount);
		        termIdfCache[term] = idf;
		      } else {
		        idf = termIdfCache[term];
		      }

		      score = idf * ((this._k1 + 1) * tf) / (this._k1 * (1 - this._b + this._b * (fieldLength / this.averageFieldLength[fieldName])) + tf);
		      score *= fieldBoost;
		      score *= docBoost;
		      scoreWithPrecision = Math.round(score * 1000) / 1000;
		      // Converts 1.23456789 to 1.234.
		      // Reducing the precision so that the vectors take up less
		      // space when serialised. Doing it now so that they behave
		      // the same before and after serialisation. Also, this is
		      // the fastest approach to reducing a number's precision in
		      // JavaScript.

		      fieldVector.insert(termIndex, scoreWithPrecision);
		    }

		    fieldVectors[fieldRef] = fieldVector;
		  }

		  this.fieldVectors = fieldVectors;
		};

		/**
		 * Creates a token set of all tokens in the index using lunr.TokenSet
		 *
		 * @private
		 */
		lunr.Builder.prototype.createTokenSet = function () {
		  this.tokenSet = lunr.TokenSet.fromArray(
		    Object.keys(this.invertedIndex).sort()
		  );
		};

		/**
		 * Builds the index, creating an instance of lunr.Index.
		 *
		 * This completes the indexing process and should only be called
		 * once all documents have been added to the index.
		 *
		 * @returns {lunr.Index}
		 */
		lunr.Builder.prototype.build = function () {
		  this.calculateAverageFieldLengths();
		  this.createFieldVectors();
		  this.createTokenSet();

		  return new lunr.Index({
		    invertedIndex: this.invertedIndex,
		    fieldVectors: this.fieldVectors,
		    tokenSet: this.tokenSet,
		    fields: Object.keys(this._fields),
		    pipeline: this.searchPipeline
		  })
		};

		/**
		 * Applies a plugin to the index builder.
		 *
		 * A plugin is a function that is called with the index builder as its context.
		 * Plugins can be used to customise or extend the behaviour of the index
		 * in some way. A plugin is just a function, that encapsulated the custom
		 * behaviour that should be applied when building the index.
		 *
		 * The plugin function will be called with the index builder as its argument, additional
		 * arguments can also be passed when calling use. The function will be called
		 * with the index builder as its context.
		 *
		 * @param {Function} plugin The plugin to apply.
		 */
		lunr.Builder.prototype.use = function (fn) {
		  var args = Array.prototype.slice.call(arguments, 1);
		  args.unshift(this);
		  fn.apply(this, args);
		};
		/**
		 * Contains and collects metadata about a matching document.
		 * A single instance of lunr.MatchData is returned as part of every
		 * lunr.Index~Result.
		 *
		 * @constructor
		 * @param {string} term - The term this match data is associated with
		 * @param {string} field - The field in which the term was found
		 * @param {object} metadata - The metadata recorded about this term in this field
		 * @property {object} metadata - A cloned collection of metadata associated with this document.
		 * @see {@link lunr.Index~Result}
		 */
		lunr.MatchData = function (term, field, metadata) {
		  var clonedMetadata = Object.create(null),
		      metadataKeys = Object.keys(metadata || {});

		  // Cloning the metadata to prevent the original
		  // being mutated during match data combination.
		  // Metadata is kept in an array within the inverted
		  // index so cloning the data can be done with
		  // Array#slice
		  for (var i = 0; i < metadataKeys.length; i++) {
		    var key = metadataKeys[i];
		    clonedMetadata[key] = metadata[key].slice();
		  }

		  this.metadata = Object.create(null);

		  if (term !== undefined) {
		    this.metadata[term] = Object.create(null);
		    this.metadata[term][field] = clonedMetadata;
		  }
		};

		/**
		 * An instance of lunr.MatchData will be created for every term that matches a
		 * document. However only one instance is required in a lunr.Index~Result. This
		 * method combines metadata from another instance of lunr.MatchData with this
		 * objects metadata.
		 *
		 * @param {lunr.MatchData} otherMatchData - Another instance of match data to merge with this one.
		 * @see {@link lunr.Index~Result}
		 */
		lunr.MatchData.prototype.combine = function (otherMatchData) {
		  var terms = Object.keys(otherMatchData.metadata);

		  for (var i = 0; i < terms.length; i++) {
		    var term = terms[i],
		        fields = Object.keys(otherMatchData.metadata[term]);

		    if (this.metadata[term] == undefined) {
		      this.metadata[term] = Object.create(null);
		    }

		    for (var j = 0; j < fields.length; j++) {
		      var field = fields[j],
		          keys = Object.keys(otherMatchData.metadata[term][field]);

		      if (this.metadata[term][field] == undefined) {
		        this.metadata[term][field] = Object.create(null);
		      }

		      for (var k = 0; k < keys.length; k++) {
		        var key = keys[k];

		        if (this.metadata[term][field][key] == undefined) {
		          this.metadata[term][field][key] = otherMatchData.metadata[term][field][key];
		        } else {
		          this.metadata[term][field][key] = this.metadata[term][field][key].concat(otherMatchData.metadata[term][field][key]);
		        }

		      }
		    }
		  }
		};

		/**
		 * Add metadata for a term/field pair to this instance of match data.
		 *
		 * @param {string} term - The term this match data is associated with
		 * @param {string} field - The field in which the term was found
		 * @param {object} metadata - The metadata recorded about this term in this field
		 */
		lunr.MatchData.prototype.add = function (term, field, metadata) {
		  if (!(term in this.metadata)) {
		    this.metadata[term] = Object.create(null);
		    this.metadata[term][field] = metadata;
		    return
		  }

		  if (!(field in this.metadata[term])) {
		    this.metadata[term][field] = metadata;
		    return
		  }

		  var metadataKeys = Object.keys(metadata);

		  for (var i = 0; i < metadataKeys.length; i++) {
		    var key = metadataKeys[i];

		    if (key in this.metadata[term][field]) {
		      this.metadata[term][field][key] = this.metadata[term][field][key].concat(metadata[key]);
		    } else {
		      this.metadata[term][field][key] = metadata[key];
		    }
		  }
		};
		/**
		 * A lunr.Query provides a programmatic way of defining queries to be performed
		 * against a {@link lunr.Index}.
		 *
		 * Prefer constructing a lunr.Query using the {@link lunr.Index#query} method
		 * so the query object is pre-initialized with the right index fields.
		 *
		 * @constructor
		 * @property {lunr.Query~Clause[]} clauses - An array of query clauses.
		 * @property {string[]} allFields - An array of all available fields in a lunr.Index.
		 */
		lunr.Query = function (allFields) {
		  this.clauses = [];
		  this.allFields = allFields;
		};

		/**
		 * Constants for indicating what kind of automatic wildcard insertion will be used when constructing a query clause.
		 *
		 * This allows wildcards to be added to the beginning and end of a term without having to manually do any string
		 * concatenation.
		 *
		 * The wildcard constants can be bitwise combined to select both leading and trailing wildcards.
		 *
		 * @constant
		 * @default
		 * @property {number} wildcard.NONE - The term will have no wildcards inserted, this is the default behaviour
		 * @property {number} wildcard.LEADING - Prepend the term with a wildcard, unless a leading wildcard already exists
		 * @property {number} wildcard.TRAILING - Append a wildcard to the term, unless a trailing wildcard already exists
		 * @see lunr.Query~Clause
		 * @see lunr.Query#clause
		 * @see lunr.Query#term
		 * @example <caption>query term with trailing wildcard</caption>
		 * query.term('foo', { wildcard: lunr.Query.wildcard.TRAILING })
		 * @example <caption>query term with leading and trailing wildcard</caption>
		 * query.term('foo', {
		 *   wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING
		 * })
		 */

		lunr.Query.wildcard = new String ("*");
		lunr.Query.wildcard.NONE = 0;
		lunr.Query.wildcard.LEADING = 1;
		lunr.Query.wildcard.TRAILING = 2;

		/**
		 * Constants for indicating what kind of presence a term must have in matching documents.
		 *
		 * @constant
		 * @enum {number}
		 * @see lunr.Query~Clause
		 * @see lunr.Query#clause
		 * @see lunr.Query#term
		 * @example <caption>query term with required presence</caption>
		 * query.term('foo', { presence: lunr.Query.presence.REQUIRED })
		 */
		lunr.Query.presence = {
		  /**
		   * Term's presence in a document is optional, this is the default value.
		   */
		  OPTIONAL: 1,

		  /**
		   * Term's presence in a document is required, documents that do not contain
		   * this term will not be returned.
		   */
		  REQUIRED: 2,

		  /**
		   * Term's presence in a document is prohibited, documents that do contain
		   * this term will not be returned.
		   */
		  PROHIBITED: 3
		};

		/**
		 * A single clause in a {@link lunr.Query} contains a term and details on how to
		 * match that term against a {@link lunr.Index}.
		 *
		 * @typedef {Object} lunr.Query~Clause
		 * @property {string[]} fields - The fields in an index this clause should be matched against.
		 * @property {number} [boost=1] - Any boost that should be applied when matching this clause.
		 * @property {number} [editDistance] - Whether the term should have fuzzy matching applied, and how fuzzy the match should be.
		 * @property {boolean} [usePipeline] - Whether the term should be passed through the search pipeline.
		 * @property {number} [wildcard=lunr.Query.wildcard.NONE] - Whether the term should have wildcards appended or prepended.
		 * @property {number} [presence=lunr.Query.presence.OPTIONAL] - The terms presence in any matching documents.
		 */

		/**
		 * Adds a {@link lunr.Query~Clause} to this query.
		 *
		 * Unless the clause contains the fields to be matched all fields will be matched. In addition
		 * a default boost of 1 is applied to the clause.
		 *
		 * @param {lunr.Query~Clause} clause - The clause to add to this query.
		 * @see lunr.Query~Clause
		 * @returns {lunr.Query}
		 */
		lunr.Query.prototype.clause = function (clause) {
		  if (!('fields' in clause)) {
		    clause.fields = this.allFields;
		  }

		  if (!('boost' in clause)) {
		    clause.boost = 1;
		  }

		  if (!('usePipeline' in clause)) {
		    clause.usePipeline = true;
		  }

		  if (!('wildcard' in clause)) {
		    clause.wildcard = lunr.Query.wildcard.NONE;
		  }

		  if ((clause.wildcard & lunr.Query.wildcard.LEADING) && (clause.term.charAt(0) != lunr.Query.wildcard)) {
		    clause.term = "*" + clause.term;
		  }

		  if ((clause.wildcard & lunr.Query.wildcard.TRAILING) && (clause.term.slice(-1) != lunr.Query.wildcard)) {
		    clause.term = "" + clause.term + "*";
		  }

		  if (!('presence' in clause)) {
		    clause.presence = lunr.Query.presence.OPTIONAL;
		  }

		  this.clauses.push(clause);

		  return this
		};

		/**
		 * A negated query is one in which every clause has a presence of
		 * prohibited. These queries require some special processing to return
		 * the expected results.
		 *
		 * @returns boolean
		 */
		lunr.Query.prototype.isNegated = function () {
		  for (var i = 0; i < this.clauses.length; i++) {
		    if (this.clauses[i].presence != lunr.Query.presence.PROHIBITED) {
		      return false
		    }
		  }

		  return true
		};

		/**
		 * Adds a term to the current query, under the covers this will create a {@link lunr.Query~Clause}
		 * to the list of clauses that make up this query.
		 *
		 * The term is used as is, i.e. no tokenization will be performed by this method. Instead conversion
		 * to a token or token-like string should be done before calling this method.
		 *
		 * The term will be converted to a string by calling `toString`. Multiple terms can be passed as an
		 * array, each term in the array will share the same options.
		 *
		 * @param {object|object[]} term - The term(s) to add to the query.
		 * @param {object} [options] - Any additional properties to add to the query clause.
		 * @returns {lunr.Query}
		 * @see lunr.Query#clause
		 * @see lunr.Query~Clause
		 * @example <caption>adding a single term to a query</caption>
		 * query.term("foo")
		 * @example <caption>adding a single term to a query and specifying search fields, term boost and automatic trailing wildcard</caption>
		 * query.term("foo", {
		 *   fields: ["title"],
		 *   boost: 10,
		 *   wildcard: lunr.Query.wildcard.TRAILING
		 * })
		 * @example <caption>using lunr.tokenizer to convert a string to tokens before using them as terms</caption>
		 * query.term(lunr.tokenizer("foo bar"))
		 */
		lunr.Query.prototype.term = function (term, options) {
		  if (Array.isArray(term)) {
		    term.forEach(function (t) { this.term(t, lunr.utils.clone(options)); }, this);
		    return this
		  }

		  var clause = options || {};
		  clause.term = term.toString();

		  this.clause(clause);

		  return this
		};
		lunr.QueryParseError = function (message, start, end) {
		  this.name = "QueryParseError";
		  this.message = message;
		  this.start = start;
		  this.end = end;
		};

		lunr.QueryParseError.prototype = new Error;
		lunr.QueryLexer = function (str) {
		  this.lexemes = [];
		  this.str = str;
		  this.length = str.length;
		  this.pos = 0;
		  this.start = 0;
		  this.escapeCharPositions = [];
		};

		lunr.QueryLexer.prototype.run = function () {
		  var state = lunr.QueryLexer.lexText;

		  while (state) {
		    state = state(this);
		  }
		};

		lunr.QueryLexer.prototype.sliceString = function () {
		  var subSlices = [],
		      sliceStart = this.start,
		      sliceEnd = this.pos;

		  for (var i = 0; i < this.escapeCharPositions.length; i++) {
		    sliceEnd = this.escapeCharPositions[i];
		    subSlices.push(this.str.slice(sliceStart, sliceEnd));
		    sliceStart = sliceEnd + 1;
		  }

		  subSlices.push(this.str.slice(sliceStart, this.pos));
		  this.escapeCharPositions.length = 0;

		  return subSlices.join('')
		};

		lunr.QueryLexer.prototype.emit = function (type) {
		  this.lexemes.push({
		    type: type,
		    str: this.sliceString(),
		    start: this.start,
		    end: this.pos
		  });

		  this.start = this.pos;
		};

		lunr.QueryLexer.prototype.escapeCharacter = function () {
		  this.escapeCharPositions.push(this.pos - 1);
		  this.pos += 1;
		};

		lunr.QueryLexer.prototype.next = function () {
		  if (this.pos >= this.length) {
		    return lunr.QueryLexer.EOS
		  }

		  var char = this.str.charAt(this.pos);
		  this.pos += 1;
		  return char
		};

		lunr.QueryLexer.prototype.width = function () {
		  return this.pos - this.start
		};

		lunr.QueryLexer.prototype.ignore = function () {
		  if (this.start == this.pos) {
		    this.pos += 1;
		  }

		  this.start = this.pos;
		};

		lunr.QueryLexer.prototype.backup = function () {
		  this.pos -= 1;
		};

		lunr.QueryLexer.prototype.acceptDigitRun = function () {
		  var char, charCode;

		  do {
		    char = this.next();
		    charCode = char.charCodeAt(0);
		  } while (charCode > 47 && charCode < 58)

		  if (char != lunr.QueryLexer.EOS) {
		    this.backup();
		  }
		};

		lunr.QueryLexer.prototype.more = function () {
		  return this.pos < this.length
		};

		lunr.QueryLexer.EOS = 'EOS';
		lunr.QueryLexer.FIELD = 'FIELD';
		lunr.QueryLexer.TERM = 'TERM';
		lunr.QueryLexer.EDIT_DISTANCE = 'EDIT_DISTANCE';
		lunr.QueryLexer.BOOST = 'BOOST';
		lunr.QueryLexer.PRESENCE = 'PRESENCE';

		lunr.QueryLexer.lexField = function (lexer) {
		  lexer.backup();
		  lexer.emit(lunr.QueryLexer.FIELD);
		  lexer.ignore();
		  return lunr.QueryLexer.lexText
		};

		lunr.QueryLexer.lexTerm = function (lexer) {
		  if (lexer.width() > 1) {
		    lexer.backup();
		    lexer.emit(lunr.QueryLexer.TERM);
		  }

		  lexer.ignore();

		  if (lexer.more()) {
		    return lunr.QueryLexer.lexText
		  }
		};

		lunr.QueryLexer.lexEditDistance = function (lexer) {
		  lexer.ignore();
		  lexer.acceptDigitRun();
		  lexer.emit(lunr.QueryLexer.EDIT_DISTANCE);
		  return lunr.QueryLexer.lexText
		};

		lunr.QueryLexer.lexBoost = function (lexer) {
		  lexer.ignore();
		  lexer.acceptDigitRun();
		  lexer.emit(lunr.QueryLexer.BOOST);
		  return lunr.QueryLexer.lexText
		};

		lunr.QueryLexer.lexEOS = function (lexer) {
		  if (lexer.width() > 0) {
		    lexer.emit(lunr.QueryLexer.TERM);
		  }
		};

		// This matches the separator used when tokenising fields
		// within a document. These should match otherwise it is
		// not possible to search for some tokens within a document.
		//
		// It is possible for the user to change the separator on the
		// tokenizer so it _might_ clash with any other of the special
		// characters already used within the search string, e.g. :.
		//
		// This means that it is possible to change the separator in
		// such a way that makes some words unsearchable using a search
		// string.
		lunr.QueryLexer.termSeparator = lunr.tokenizer.separator;

		lunr.QueryLexer.lexText = function (lexer) {
		  while (true) {
		    var char = lexer.next();

		    if (char == lunr.QueryLexer.EOS) {
		      return lunr.QueryLexer.lexEOS
		    }

		    // Escape character is '\'
		    if (char.charCodeAt(0) == 92) {
		      lexer.escapeCharacter();
		      continue
		    }

		    if (char == ":") {
		      return lunr.QueryLexer.lexField
		    }

		    if (char == "~") {
		      lexer.backup();
		      if (lexer.width() > 0) {
		        lexer.emit(lunr.QueryLexer.TERM);
		      }
		      return lunr.QueryLexer.lexEditDistance
		    }

		    if (char == "^") {
		      lexer.backup();
		      if (lexer.width() > 0) {
		        lexer.emit(lunr.QueryLexer.TERM);
		      }
		      return lunr.QueryLexer.lexBoost
		    }

		    // "+" indicates term presence is required
		    // checking for length to ensure that only
		    // leading "+" are considered
		    if (char == "+" && lexer.width() === 1) {
		      lexer.emit(lunr.QueryLexer.PRESENCE);
		      return lunr.QueryLexer.lexText
		    }

		    // "-" indicates term presence is prohibited
		    // checking for length to ensure that only
		    // leading "-" are considered
		    if (char == "-" && lexer.width() === 1) {
		      lexer.emit(lunr.QueryLexer.PRESENCE);
		      return lunr.QueryLexer.lexText
		    }

		    if (char.match(lunr.QueryLexer.termSeparator)) {
		      return lunr.QueryLexer.lexTerm
		    }
		  }
		};

		lunr.QueryParser = function (str, query) {
		  this.lexer = new lunr.QueryLexer (str);
		  this.query = query;
		  this.currentClause = {};
		  this.lexemeIdx = 0;
		};

		lunr.QueryParser.prototype.parse = function () {
		  this.lexer.run();
		  this.lexemes = this.lexer.lexemes;

		  var state = lunr.QueryParser.parseClause;

		  while (state) {
		    state = state(this);
		  }

		  return this.query
		};

		lunr.QueryParser.prototype.peekLexeme = function () {
		  return this.lexemes[this.lexemeIdx]
		};

		lunr.QueryParser.prototype.consumeLexeme = function () {
		  var lexeme = this.peekLexeme();
		  this.lexemeIdx += 1;
		  return lexeme
		};

		lunr.QueryParser.prototype.nextClause = function () {
		  var completedClause = this.currentClause;
		  this.query.clause(completedClause);
		  this.currentClause = {};
		};

		lunr.QueryParser.parseClause = function (parser) {
		  var lexeme = parser.peekLexeme();

		  if (lexeme == undefined) {
		    return
		  }

		  switch (lexeme.type) {
		    case lunr.QueryLexer.PRESENCE:
		      return lunr.QueryParser.parsePresence
		    case lunr.QueryLexer.FIELD:
		      return lunr.QueryParser.parseField
		    case lunr.QueryLexer.TERM:
		      return lunr.QueryParser.parseTerm
		    default:
		      var errorMessage = "expected either a field or a term, found " + lexeme.type;

		      if (lexeme.str.length >= 1) {
		        errorMessage += " with value '" + lexeme.str + "'";
		      }

		      throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }
		};

		lunr.QueryParser.parsePresence = function (parser) {
		  var lexeme = parser.consumeLexeme();

		  if (lexeme == undefined) {
		    return
		  }

		  switch (lexeme.str) {
		    case "-":
		      parser.currentClause.presence = lunr.Query.presence.PROHIBITED;
		      break
		    case "+":
		      parser.currentClause.presence = lunr.Query.presence.REQUIRED;
		      break
		    default:
		      var errorMessage = "unrecognised presence operator'" + lexeme.str + "'";
		      throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }

		  var nextLexeme = parser.peekLexeme();

		  if (nextLexeme == undefined) {
		    var errorMessage = "expecting term or field, found nothing";
		    throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }

		  switch (nextLexeme.type) {
		    case lunr.QueryLexer.FIELD:
		      return lunr.QueryParser.parseField
		    case lunr.QueryLexer.TERM:
		      return lunr.QueryParser.parseTerm
		    default:
		      var errorMessage = "expecting term or field, found '" + nextLexeme.type + "'";
		      throw new lunr.QueryParseError (errorMessage, nextLexeme.start, nextLexeme.end)
		  }
		};

		lunr.QueryParser.parseField = function (parser) {
		  var lexeme = parser.consumeLexeme();

		  if (lexeme == undefined) {
		    return
		  }

		  if (parser.query.allFields.indexOf(lexeme.str) == -1) {
		    var possibleFields = parser.query.allFields.map(function (f) { return "'" + f + "'" }).join(', '),
		        errorMessage = "unrecognised field '" + lexeme.str + "', possible fields: " + possibleFields;

		    throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }

		  parser.currentClause.fields = [lexeme.str];

		  var nextLexeme = parser.peekLexeme();

		  if (nextLexeme == undefined) {
		    var errorMessage = "expecting term, found nothing";
		    throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }

		  switch (nextLexeme.type) {
		    case lunr.QueryLexer.TERM:
		      return lunr.QueryParser.parseTerm
		    default:
		      var errorMessage = "expecting term, found '" + nextLexeme.type + "'";
		      throw new lunr.QueryParseError (errorMessage, nextLexeme.start, nextLexeme.end)
		  }
		};

		lunr.QueryParser.parseTerm = function (parser) {
		  var lexeme = parser.consumeLexeme();

		  if (lexeme == undefined) {
		    return
		  }

		  parser.currentClause.term = lexeme.str.toLowerCase();

		  if (lexeme.str.indexOf("*") != -1) {
		    parser.currentClause.usePipeline = false;
		  }

		  var nextLexeme = parser.peekLexeme();

		  if (nextLexeme == undefined) {
		    parser.nextClause();
		    return
		  }

		  switch (nextLexeme.type) {
		    case lunr.QueryLexer.TERM:
		      parser.nextClause();
		      return lunr.QueryParser.parseTerm
		    case lunr.QueryLexer.FIELD:
		      parser.nextClause();
		      return lunr.QueryParser.parseField
		    case lunr.QueryLexer.EDIT_DISTANCE:
		      return lunr.QueryParser.parseEditDistance
		    case lunr.QueryLexer.BOOST:
		      return lunr.QueryParser.parseBoost
		    case lunr.QueryLexer.PRESENCE:
		      parser.nextClause();
		      return lunr.QueryParser.parsePresence
		    default:
		      var errorMessage = "Unexpected lexeme type '" + nextLexeme.type + "'";
		      throw new lunr.QueryParseError (errorMessage, nextLexeme.start, nextLexeme.end)
		  }
		};

		lunr.QueryParser.parseEditDistance = function (parser) {
		  var lexeme = parser.consumeLexeme();

		  if (lexeme == undefined) {
		    return
		  }

		  var editDistance = parseInt(lexeme.str, 10);

		  if (isNaN(editDistance)) {
		    var errorMessage = "edit distance must be numeric";
		    throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }

		  parser.currentClause.editDistance = editDistance;

		  var nextLexeme = parser.peekLexeme();

		  if (nextLexeme == undefined) {
		    parser.nextClause();
		    return
		  }

		  switch (nextLexeme.type) {
		    case lunr.QueryLexer.TERM:
		      parser.nextClause();
		      return lunr.QueryParser.parseTerm
		    case lunr.QueryLexer.FIELD:
		      parser.nextClause();
		      return lunr.QueryParser.parseField
		    case lunr.QueryLexer.EDIT_DISTANCE:
		      return lunr.QueryParser.parseEditDistance
		    case lunr.QueryLexer.BOOST:
		      return lunr.QueryParser.parseBoost
		    case lunr.QueryLexer.PRESENCE:
		      parser.nextClause();
		      return lunr.QueryParser.parsePresence
		    default:
		      var errorMessage = "Unexpected lexeme type '" + nextLexeme.type + "'";
		      throw new lunr.QueryParseError (errorMessage, nextLexeme.start, nextLexeme.end)
		  }
		};

		lunr.QueryParser.parseBoost = function (parser) {
		  var lexeme = parser.consumeLexeme();

		  if (lexeme == undefined) {
		    return
		  }

		  var boost = parseInt(lexeme.str, 10);

		  if (isNaN(boost)) {
		    var errorMessage = "boost must be numeric";
		    throw new lunr.QueryParseError (errorMessage, lexeme.start, lexeme.end)
		  }

		  parser.currentClause.boost = boost;

		  var nextLexeme = parser.peekLexeme();

		  if (nextLexeme == undefined) {
		    parser.nextClause();
		    return
		  }

		  switch (nextLexeme.type) {
		    case lunr.QueryLexer.TERM:
		      parser.nextClause();
		      return lunr.QueryParser.parseTerm
		    case lunr.QueryLexer.FIELD:
		      parser.nextClause();
		      return lunr.QueryParser.parseField
		    case lunr.QueryLexer.EDIT_DISTANCE:
		      return lunr.QueryParser.parseEditDistance
		    case lunr.QueryLexer.BOOST:
		      return lunr.QueryParser.parseBoost
		    case lunr.QueryLexer.PRESENCE:
		      parser.nextClause();
		      return lunr.QueryParser.parsePresence
		    default:
		      var errorMessage = "Unexpected lexeme type '" + nextLexeme.type + "'";
		      throw new lunr.QueryParseError (errorMessage, nextLexeme.start, nextLexeme.end)
		  }
		}

		  /**
		   * export the module via AMD, CommonJS or as a browser global
		   * Export code from https://github.com/umdjs/umd/blob/master/returnExports.js
		   */
		  ;(function (root, factory) {
		    {
		      /**
		       * Node. Does not work with strict CommonJS, but
		       * only CommonJS-like enviroments that support module.exports,
		       * like Node.
		       */
		      module.exports = factory();
		    }
		  }(this, function () {
		    /**
		     * Just return a value to define the module export.
		     * This example returns an object, but the module
		     * can return a function as the exported value.
		     */
		    return lunr
		  }));
		})(); 
	} (lunr));

	var lunrExports = lunr.exports;

	/**
	 * Loads main search index.
	 *
	 * @returns {Promise<boolean>} Did the search index load.
	 */
	async function loadMainSearchData()
	{
	   const dmtURL = (_documentCurrentScript && _documentCurrentScript.src || new URL('dmt-components.js', document.baseURI).href).replace(/\/dmt-components.js/, '');

	   const response = await fetch(`${dmtURL}/dmt-search.cmp`);

	   if (!response.ok)
	   {
	      console.warn(`[typedoc-theme-default-modern] Could not load search index.`);
	      return false;
	   }

	   try
	   {
	      const arrayBuffer = await response.arrayBuffer();

	      /** @type {{ rows: SearchDocument[], index: [] }} */
	      const data = globalThis.dmtInflateAndUnpack(new Uint8Array(arrayBuffer));

	      globalThis.dmtSearchMainRows = data.rows;
	      globalThis.dmtSearchMainIndex = lunrExports.Index.load(data.index);
	   }
	   catch (err)
	   {
	      console.warn(`[typedoc-theme-default-modern] Could not load search index.`);
	      console.error(err);
	      return false;
	   }

	   return true;
	}

	// Expose the compression / MessagePack handling functions into the global scope. This reduces any duplication across
	// plugins that might work with compressed data.
	globalThis.dmtInflateAndUnpack = inflateAndUnpack;
	globalThis.dmtInflateAndUnpackB64 = inflateAndUnpackB64;

	const dmtComponentData = /** @type {DMTComponentData} */ (typeof globalThis.dmtComponentDataBCMP === 'string' ?
	 globalThis.dmtInflateAndUnpackB64(globalThis.dmtComponentDataBCMP) : {});
	console.log(`!!! DMT - globalThis.dmtComponentDataBCMP: `, globalThis.dmtComponentDataBCMP);
	console.log(`!!! DMT - dmtComponentData: `, dmtComponentData);
	// Setup additional runtime component data ---------------------------------------------------------------------------

	dmtComponentData.baseURL = (_documentCurrentScript && _documentCurrentScript.src || new URL('dmt-components.js', document.baseURI).href).replace(/assets\/dmt\/dmt-components.js/, '');
	dmtComponentData.dmtURL = (_documentCurrentScript && _documentCurrentScript.src || new URL('dmt-components.js', document.baseURI).href).replace(/dmt-components.js/, '');

	dmtComponentData.initialPathURL = globalThis.location.href.replace(dmtComponentData.baseURL, '');

	// Find the path URL match without any additional URL fragment.
	const depth = (dmtComponentData.initialPathURL.match(/\//) ?? []).length;
	dmtComponentData.basePath = '../'.repeat(depth);

	dmtComponentData.iconsPrepend = dmtComponentData.iconsCached ? `${dmtComponentData.basePath}assets/icons.svg` : '';

	// Create navigation data / state.
	dmtComponentData.navigationData = new NavigationData(dmtComponentData);

	dmtComponentData.dmtLocalStorage = new TJSLocalStorage();

	// Mount Svelte components -------------------------------------------------------------------------------------------

	// Must initialize first so that `animate` local storage initially is configured from OS / browser
	// `prefersReducedMotion` state.
	const dmtSettings = new DMTSettings$1({
	   target: document.querySelector('.tsd-navigation.settings .tsd-accordion-details'),
	   props: { dmtComponentData }
	});

	// Remove the static sidebar links as DMT navigation includes the links.
	const staticSidebarEl = document.querySelector('nav#tsd-sidebar-links');
	if (staticSidebarEl) { staticSidebarEl.remove(); }

	// Remove all default children from navigation as it is being replaced by the Navigation Svelte component.
	const navEl = document.querySelector('nav.tsd-navigation');
	if (navEl && navEl.firstChild)
	{
	   while (navEl.firstChild) { navEl.removeChild(navEl.firstChild); }
	}

	const navigation = new Navigation$1({
	   target: document.querySelector('nav.tsd-navigation'),
	   props: { dmtComponentData }
	});

	const toolbar = new Toolbar$1({
	   target: document.querySelector('#dmt-toolbar'),
	   props: { dmtComponentData }
	});

	// Stores references to DMT Svelte components.
	globalThis.dmtComponents = {
	   dmtSettings,
	   navigation,
	   toolbar
	};

	// Only load main search index if enabled.
	if (dmtComponentData.search)
	{
	   loadMainSearchData();
	   globalThis.dmtComponents.searchMain = new SearchMain$1({
	      target: document.querySelector('#dmt-search-main'),
	      props: { dmtComponentData }
	   });
	}

	// TODO: Work in progress - Finish `searchQuick` functionality.
	// // Only load quick search index if enabled.
	// if (dmtComponentData.searchQuick)
	// {
	//    loadQuickSearchData().then((result) =>
	//    {
	//       if (result) { new SearchQuick({ target: globalThis.document.body }); }
	//    });
	// }

	// -------------------------------------------------------------------------------------------------------------------

	// Provides global keyboard commands.
	keyCommands(dmtComponentData);

	// Provide automatic focusing of DMT scrollable containers on `pointerover` when there is no explicitly focused
	// element allowing intuitive scrolling.
	scrollActivation();

	// Adds a new style rule to set `body` visibility to `visible` after all scripts have loaded. This allows a smoother
	// transition for the `main.js` default template script to take effect along with all Svelte components loaded before
	// the page is initially visible. There is minimal flicker.
	globalThis.requestAnimationFrame(() =>
	{
	   const style = document.createElement('style');
	   style.innerHTML = 'body { visibility: visible; }';
	   document.head.appendChild(style);
	});

})();
