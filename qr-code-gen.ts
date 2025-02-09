const QRCode = (() => {
  /* Quick overview: QR code composed of 2D array of modules (a rectangular
   * area that conveys one bit of information); some modules are fixed to help
   * the recognition of the code, and remaining data modules are further divided
   * into 8-bit code words which are augumented by Reed-Solomon error correcting
   * codes (ECC). There could be multiple ECCs, in the case the code is so large
   * that it is helpful to split the raw data into several chunks.
   *
   * The number of modules is determined by the code's "version", ranging from 1
   * (21x21) to 40 (177x177). How many ECC bits are used is determined by the
   * ECC level (L/M/Q/H). The number and size (and thus the order of generator
   * polynomial) of ECCs depend to the version and ECC level.
   */

  // Per-version information (cf. JIS X 0510:2004 pp. 30--36, 71)
  //
  // [0]: the degree of generator polynomial by ECC levels
  // [1]: # of code blocks by ECC levels
  // [2]: left-top positions of alignment patterns
  //
  // the number in this table (in particular, [0]) does not exactly match with
  // the numbers in the specficiation. See augumenteccs below for the reason.
  const VERSIONS = [
    null,
    [[10, 7, 17, 13], [1, 1, 1, 1], []],
    [
      [16, 10, 28, 22],
      [1, 1, 1, 1],
      [4, 16],
    ],
    [
      [26, 15, 22, 18],
      [1, 1, 2, 2],
      [4, 20],
    ],
    [
      [18, 20, 16, 26],
      [2, 1, 4, 2],
      [4, 24],
    ],
    [
      [24, 26, 22, 18],
      [2, 1, 4, 4],
      [4, 28],
    ],
    [
      [16, 18, 28, 24],
      [4, 2, 4, 4],
      [4, 32],
    ],
    [
      [18, 20, 26, 18],
      [4, 2, 5, 6],
      [4, 20, 36],
    ],
    [
      [22, 24, 26, 22],
      [4, 2, 6, 6],
      [4, 22, 40],
    ],
    [
      [22, 30, 24, 20],
      [5, 2, 8, 8],
      [4, 24, 44],
    ],
    [
      [26, 18, 28, 24],
      [5, 4, 8, 8],
      [4, 26, 48],
    ],
    [
      [30, 20, 24, 28],
      [5, 4, 11, 8],
      [4, 28, 52],
    ],
    [
      [22, 24, 28, 26],
      [8, 4, 11, 10],
      [4, 30, 56],
    ],
    [
      [22, 26, 22, 24],
      [9, 4, 16, 12],
      [4, 32, 60],
    ],
    [
      [24, 30, 24, 20],
      [9, 4, 16, 16],
      [4, 24, 44, 64],
    ],
    [
      [24, 22, 24, 30],
      [10, 6, 18, 12],
      [4, 24, 46, 68],
    ],
    [
      [28, 24, 30, 24],
      [10, 6, 16, 17],
      [4, 24, 48, 72],
    ],
    [
      [28, 28, 28, 28],
      [11, 6, 19, 16],
      [4, 28, 52, 76],
    ],
    [
      [26, 30, 28, 28],
      [13, 6, 21, 18],
      [4, 28, 54, 80],
    ],
    [
      [26, 28, 26, 26],
      [14, 7, 25, 21],
      [4, 28, 56, 84],
    ],
    [
      [26, 28, 28, 30],
      [16, 8, 25, 20],
      [4, 32, 60, 88],
    ],
    [
      [26, 28, 30, 28],
      [17, 8, 25, 23],
      [4, 26, 48, 70, 92],
    ],
    [
      [28, 28, 24, 30],
      [17, 9, 34, 23],
      [4, 24, 48, 72, 96],
    ],
    [
      [28, 30, 30, 30],
      [18, 9, 30, 25],
      [4, 28, 52, 76, 100],
    ],
    [
      [28, 30, 30, 30],
      [20, 10, 32, 27],
      [4, 26, 52, 78, 104],
    ],
    [
      [28, 26, 30, 30],
      [21, 12, 35, 29],
      [4, 30, 56, 82, 108],
    ],
    [
      [28, 28, 30, 28],
      [23, 12, 37, 34],
      [4, 28, 56, 84, 112],
    ],
    [
      [28, 30, 30, 30],
      [25, 12, 40, 34],
      [4, 32, 60, 88, 116],
    ],
    [
      [28, 30, 30, 30],
      [26, 13, 42, 35],
      [4, 24, 48, 72, 96, 120],
    ],
    [
      [28, 30, 30, 30],
      [28, 14, 45, 38],
      [4, 28, 52, 76, 100, 124],
    ],
    [
      [28, 30, 30, 30],
      [29, 15, 48, 40],
      [4, 24, 50, 76, 102, 128],
    ],
    [
      [28, 30, 30, 30],
      [31, 16, 51, 43],
      [4, 28, 54, 80, 106, 132],
    ],
    [
      [28, 30, 30, 30],
      [33, 17, 54, 45],
      [4, 32, 58, 84, 110, 136],
    ],
    [
      [28, 30, 30, 30],
      [35, 18, 57, 48],
      [4, 28, 56, 84, 112, 140],
    ],
    [
      [28, 30, 30, 30],
      [37, 19, 60, 51],
      [4, 32, 60, 88, 116, 144],
    ],
    [
      [28, 30, 30, 30],
      [38, 19, 63, 53],
      [4, 28, 52, 76, 100, 124, 148],
    ],
    [
      [28, 30, 30, 30],
      [40, 20, 66, 56],
      [4, 22, 48, 74, 100, 126, 152],
    ],
    [
      [28, 30, 30, 30],
      [43, 21, 70, 59],
      [4, 26, 52, 78, 104, 130, 156],
    ],
    [
      [28, 30, 30, 30],
      [45, 22, 74, 62],
      [4, 30, 56, 82, 108, 134, 160],
    ],
    [
      [28, 30, 30, 30],
      [47, 24, 77, 65],
      [4, 24, 52, 80, 108, 136, 164],
    ],
    [
      [28, 30, 30, 30],
      [49, 25, 81, 68],
      [4, 28, 56, 84, 112, 140, 168],
    ],
  ];

  // Mode constants (cf. Table 2 in JIS X 0510:2004 p. 16)
  const MODE_TERMINATOR = 0;
  const MODE_NUMERIC = 1;
  const MODE_ALPHANUMERIC = 2;
  const MODE_OCTET = 4;
  const MODE_KANJI = 8;

  // Validation regexps
  const NUMERIC_REGEXP = /^\d*$/;
  const ALPHANUMERIC_REGEXP = /^[A-Za-z0-9 $%*+\-./:]*$/;
  const ALPHANUMERIC_OUT_REGEXP = /^[A-Z0-9 $%*+\-./:]*$/;

  // ECC levels (cf. Table 22 in JIS X 0510:2004 p. 45)
  const ECCLEVEL_L = 1;
  const ECCLEVEL_M = 0;
  const ECCLEVEL_Q = 3;
  const ECCLEVEL_H = 2;

  // GF(2^8)-to-integer mapping with a reducing polynomial x^8+x^4+x^3+x^2+1
  // Invariant: GF256_MAP[GF256_INVMAP[i]] == i for all i in [1,256)
  const GF256_MAP: number[] = [];
  const GF256_INVMAP: number[] = [-1];
  for (let i = 0, v = 1; i < 255; ++i) {
    GF256_MAP.push(v);
    GF256_INVMAP[v] = i;
    v = (v * 2) ^ (v >= 128 ? 0x11d : 0);
  }

  // Generator polynomials up to degree 30
  // (should match with polynomials in JIS X 0510:2004 Appendix A)
  //
  // Generator polynomial of degree K is product of (x-\alpha^0), (x-\alpha^1),
  // ..., (x-\alpha^(K-1)). By convention, we omit the K-th coefficient (always 1)
  // from the result; also other coefficients are written in terms of the exponent
  // to \alpha to avoid the redundant calculation. (See also calculateecc below.)
  const GF256_GENPOLY: number[][] = [[]];
  for (let i = 0; i < 30; ++i) {
    const prevpoly = GF256_GENPOLY[i];
    const poly = [];

    for (let j = 0; j <= i; ++j) {
      const a = j < i ? GF256_MAP[prevpoly[j]] : 0;
      const b = GF256_MAP[(i + (prevpoly[j - 1] || 0)) % 255];
      poly.push(GF256_INVMAP[a ^ b]);
    }

    GF256_GENPOLY.push(poly);
  }

  // Alphanumeric character mapping (cf. Table 5 in JIS X 0510:2004 p. 19)
  const ALPHANUMERIC_MAP: { [key: string]: number } = {};
  for (let i = 0; i < 45; ++i) {
    ALPHANUMERIC_MAP[
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:".charAt(i)
    ] = i;
  }

  // Mask functions in terms of row # and column #
  // (cf. Table 20 in JIS X 0510:2004 p. 42)
  const MASKFUNCS = [
    (i: number, j: number) => (i + j) % 2 == 0,
    (i: number, _j: number) => i % 2 == 0,
    (_i: number, j: number) => j % 3 == 0,
    (i: number, j: number) => (i + j) % 3 == 0,
    (i: number, j: number) => (((i / 2) | 0) + ((j / 3) | 0)) % 2 == 0,
    (i: number, j: number) => ((i * j) % 2) + ((i * j) % 3) == 0,
    (i: number, j: number) => (((i * j) % 2) + ((i * j) % 3)) % 2 == 0,
    (i: number, j: number) => (((i + j) % 2) + ((i * j) % 3)) % 2 == 0,
  ];

  /** Returns true when the version information has to be embeded. */
  const needsVersionInfo = (ver: number) => {
    return ver > 6;
  };

  /** Returns the size of entire QR code for given version. */
  const getSizeByVersion = (ver: number) => {
    return 4 * ver + 17;
  };

  /** Returns the number of bits available for code words in this version. */
  const nFullBits = (ver: number) => {
    /*
     * |<--------------- n --------------->|
     * |        |<----- n-17 ---->|        |
     * +-------+                ///+-------+ ----
     * |       |                ///|       |    ^
     * |  9x9  |       @@@@@    ///|  9x8  |    |
     * |       | # # # @5x5@ # # # |       |    |
     * +-------+       @@@@@       +-------+    |
     *       #                               ---|
     *                                        ^ |
     *       #                                |
     *     @@@@@       @@@@@       @@@@@      | n
     *     @5x5@       @5x5@       @5x5@   n-17
     *     @@@@@       @@@@@       @@@@@      | |
     *       #                                | |
     * //////                                 v |
     * //////#                               ---|
     * +-------+       @@@@@       @@@@@        |
     * |       |       @5x5@       @5x5@        |
     * |  8x9  |       @@@@@       @@@@@        |
     * |       |                                v
     * +-------+                             ----
     *
     * When the entire code has n^2 modules and there are m^2-3 alignment
     * patterns, we have:
     * - 225 (= 9x9 + 9x8 + 8x9) modules for finder patterns and
     *   format information;
     * - 2n-34 (= 2(n-17)) modules for timing patterns;
     * - 36 (= 3x6 + 6x3) modules for version information, if any;
     * - 25m^2-75 (= (m^2-3)(5x5)) modules for alignment patterns
     *   if any, but 10m-20 (= 2(m-2)x5) of them overlaps with
     *   timing patterns.
     */
    const v = VERSIONS[ver];
    let nbits = 16 * ver * ver + 128 * ver + 64; // finder, timing and format info.
    if (needsVersionInfo(ver)) nbits -= 36; // version information
    if (v && v[2].length) {
      // Alignment patterns
      nbits -= 25 * v[2].length * v[2].length - 10 * v[2].length - 55;
    }
    return nbits;
  };

  /**
   * Returns the number of bits available for data portions (i.e. excludes ECC
   * bits but includes mode and length bits) in this version and ECC level.
   */
  const nDataBits = (ver: number, ecclevel: number) => {
    let nbits = nFullBits(ver) & ~7; // no sub-octet code words
    const v = VERSIONS[ver];
    if (v) {
      nbits -= 8 * v[0][ecclevel] * v[1][ecclevel]; // ecc bits
    }
    return nbits;
  };

  /**
   * Returns the number of bits required for the length of data based on the version and mode.
   * The number of bits required varies depending on the version and mode.
   */
  const nDataLenBits = (ver: number, mode: number) => {
    switch (mode) {
      case MODE_NUMERIC:
        return ver < 10 ? 10 : ver < 27 ? 12 : 14;
      case MODE_ALPHANUMERIC:
        return ver < 10 ? 9 : ver < 27 ? 11 : 13;
      case MODE_OCTET:
        return ver < 10 ? 8 : 16;
      case MODE_KANJI:
        return ver < 10 ? 8 : ver < 27 ? 10 : 12;
      default:
        return 0;
    }
  };

  /** Returns the maximum length of data possible in given configuration. */
  const getMaxDataLength = (ver: number, mode: number, ecclevel: number) => {
    const nbits = nDataBits(ver, ecclevel) - 4 - nDataLenBits(ver, mode); // 4 for mode bits
    switch (mode) {
      case MODE_NUMERIC:
        return (
          ((nbits / 10) | 0) * 3 + (nbits % 10 < 4 ? 0 : nbits % 10 < 7 ? 1 : 2)
        );
      case MODE_ALPHANUMERIC:
        return ((nbits / 11) | 0) * 2 + (nbits % 11 < 6 ? 0 : 1);
      case MODE_OCTET:
        return (nbits / 8) | 0;
      case MODE_KANJI:
        return (nbits / 13) | 0;
      default:
        return 0; // TODO: Use type instead of numeric value
    }
  };

  /**
   * Checks if the given data can be encoded in given mode, and returns
   * the converted data for further processing if possible. Otherwise
   * returns null.
   */
  const validateData = (mode: number, data: string) => {
    switch (mode) {
      case MODE_NUMERIC:
        if (!data.match(NUMERIC_REGEXP)) return null;
        return data;

      case MODE_ALPHANUMERIC:
        if (!data.match(ALPHANUMERIC_REGEXP)) return null;
        return data.toUpperCase();

      case MODE_OCTET:
        if (typeof data === "string") {
          // encode as utf-8 string
          const newdata = [];
          for (let i = 0; i < data.length; ++i) {
            const ch = data.codePointAt(i);
            if (ch !== undefined && ch < 0x80) {
              newdata.push(ch);
            } else if (ch !== undefined && ch < 0x800) {
              newdata.push(0xc0 | (ch >> 6), 0x80 | (ch & 0x3f));
            } else if (ch !== undefined && ch < 0x10000) {
              newdata.push(
                0xe0 | (ch >> 12),
                0x80 | ((ch >> 6) & 0x3f),
                0x80 | (ch & 0x3f)
              );
            } else {
              newdata.push(
                0xf0 | (ch! >> 18),
                0x80 | ((ch! >> 12) & 0x3f),
                0x80 | ((ch! >> 6) & 0x3f),
                0x80 | (ch! & 0x3f)
              );
            }
          }
          return newdata;
        } else {
          return data;
        }
    }
  };

  /**
   * Returns the code words (sans ECC bits) for given data and configurations.
   * Requires data to be preprocessed by validatedata. no length check is
   * performed, and everything has to be checked before calling this function.
   */
  const encode = (
    ver: number,
    mode: number,
    data: string | number[],
    maxbuflen: number
  ) => {
    const buf = [];
    let bits = 0;
    let remaining = 8;
    const datalen = data.length;

    // this function is intentionally no-op when n=0.
    const pack = (x: number, n: number) => {
      if (n >= remaining) {
        buf.push(bits | (x >> (n -= remaining)));
        while (n >= 8) buf.push((x >> (n -= 8)) & 255);
        bits = 0;
        remaining = 8;
      }
      if (n > 0) bits |= (x & ((1 << n) - 1)) << (remaining -= n);
    };

    const nlenbits = nDataLenBits(ver, mode);
    pack(mode, 4);
    pack(datalen, nlenbits);

    switch (mode) {
      case MODE_NUMERIC: {
        if (typeof data === "string") {
          let i;
          for (i = 2; i < datalen; i += 3) {
            pack(parseInt(data.substring(i - 2, i + 1), 10), 10);
          }
          pack(parseInt(data.substring(i - 2), 10), [0, 4, 7][datalen % 3]);
        }
        break;
      }

      case MODE_ALPHANUMERIC: {
        if (typeof data === "string") {
          let i;
          for (i = 1; i < datalen; i += 2) {
            pack(
              ALPHANUMERIC_MAP[data.charAt(i - 1)] * 45 +
                ALPHANUMERIC_MAP[data.charAt(i)],
              11
            );
          }
          if (datalen % 2 == 1) {
            pack(ALPHANUMERIC_MAP[data.charAt(i - 1)], 6);
          }
        }
        break;
      }

      case MODE_OCTET: {
        for (let i = 0; i < datalen; ++i) {
          if (typeof data[i] === "number") {
            pack(data[i] as number, 8);
          }
        }
        break;
      }
    }

    // Final bits. It is possible that adding terminator causes the buffer
    // to overflow, but then the buffer truncated to the maximum size will
    // be valid as the truncated terminator mode bits and padding is
    // identical in appearance (cf. JIS X 0510:2004 sec 8.4.8).
    pack(MODE_TERMINATOR, 4);
    if (remaining < 8) buf.push(bits);

    // The padding to fill up the remaining space. We should not add any
    // words when the overflow already occurred.
    while (buf.length + 1 < maxbuflen) buf.push(0xec, 0x11);
    if (buf.length < maxbuflen) buf.push(0xec);
    return buf;
  };

  /**
   * Calculates ECC code words for given code words and generator polynomial.
   *
   * This is quite similar to CRC calculation as both Reed-Solomon and CRC use
   * the certain kind of cyclic codes, which is effectively the division of
   * zero-augmented polynomial by the generator polynomial. The only difference
   * is that Reed-Solomon uses GF(2^8), instead of CRC's GF(2), and Reed-Solomon
   * uses the different generator polynomial than CRC's.
   */
  const calculateEcc = (poly: number[], genpoly: number[]) => {
    const modulus = poly.slice(0);
    const polylen = poly.length;
    const genpolylen = genpoly.length;

    for (let i = 0; i < genpolylen; ++i) modulus.push(0);

    for (let i = 0; i < polylen; ) {
      const quotient = GF256_INVMAP[modulus[i++]];
      if (quotient >= 0) {
        for (let j = 0; j < genpolylen; ++j) {
          modulus[i + j] ^= GF256_MAP[(quotient + genpoly[j]) % 255];
        }
      }
    }

    return modulus.slice(polylen);
  };

  /**
   * Augments ECC code words to given code words. The resulting words are
   * ready to be encoded in the matrix.
   *
   * Much of actual augmenting procedure follows JIS X 0510:2004 sec 8.7.
   * The code is simplified using the fact that the size of each code & ECC
   * blocks is almost same; for example, when we have 4 blocks and 46 data words
   * the number of code words in those blocks are 11, 11, 12, 12 respectively.
   */
  const augumentEccs = (poly: number[], nblocks: number, genpoly: number[]) => {
    const subsizes = [];
    const subsize = (poly.length / nblocks) | 0;
    let subsize0 = 0;
    const pivot = nblocks - (poly.length % nblocks);

    for (let i = 0; i < pivot; ++i) {
      subsizes.push(subsize0);
      subsize0 += subsize;
    }

    for (let i = pivot; i < nblocks; ++i) {
      subsizes.push(subsize0);
      subsize0 += subsize + 1;
    }

    subsizes.push(subsize0);

    const eccs = [];
    for (let i = 0; i < nblocks; ++i) {
      eccs.push(
        calculateEcc(poly.slice(subsizes[i], subsizes[i + 1]), genpoly)
      );
    }

    const result = [];
    const nItemsPerBlock = (poly.length / nblocks) | 0;
    for (let i = 0; i < nItemsPerBlock; ++i) {
      for (let j = 0; j < nblocks; ++j) {
        result.push(poly[subsizes[j] + i]);
      }
    }

    for (let j = pivot; j < nblocks; ++j) {
      result.push(poly[subsizes[j + 1] - 1]);
    }

    for (let i = 0; i < genpoly.length; ++i) {
      for (let j = 0; j < nblocks; ++j) {
        result.push(eccs[j][i]);
      }
    }

    return result;
  };

  /**
   * Augments BCH(p+q,q) code to the polynomial over GF(2), given the proper
   * genpoly. Both input and output are in binary numbers, and unlike
   * calculateecc genpoly should include the 1 bit for the highest degree.
   *
   * Actual polynomials used for this procedure are as follows:
   * - p=10, q=5, genpoly=x^10+x^8+x^5+x^4+x^2+x+1 (JIS X 0510:2004 Appendix C)
   * - p=18, q=6, genpoly=x^12+x^11+x^10+x^9+x^8+x^5+x^2+1 (ibid. Appendix D)
   */
  const augumentBch = (poly: number, p: number, genpoly: number, q: number) => {
    let modulus = poly << q;
    for (let i = p - 1; i >= 0; --i) {
      if ((modulus >> (q + i)) & 1) modulus ^= genpoly << i;
    }

    return (poly << q) | modulus;
  };

  /**
   * Creates the base matrix for given version. It returns two matrices, one of
   * them is the actual one and the another represents the "reserved" portion
   * (e.g. finder and timing patterns) of the matrix.
   *
   * Some entries in the matrix may be undefined, rather than 0 or 1. This is
   * intentional (no initialization needed!), and putdata below will fill
   * the remaining ones.
   */
  const makeBaseMatrix = (ver: number) => {
    const v = VERSIONS[ver];
    const n = getSizeByVersion(ver);
    const matrix: number[][] = [];
    const reserved: number[][] = [];

    for (let i = 0; i < n; ++i) {
      matrix.push([]);
      reserved.push([]);
    }

    const blit = (
      y: number,
      x: number,
      h: number,
      w: number,
      bits: number[]
    ) => {
      for (let i = 0; i < h; ++i) {
        for (let j = 0; j < w; ++j) {
          matrix[y + i][x + j] = (bits[i] >> j) & 1;
          reserved[y + i][x + j] = 1;
        }
      }
    };

    // Finder patterns and a part of timing patterns
    // will also mark the format information area (not yet written) as reserved.
    blit(0, 0, 9, 9, [0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x17f, 0x00, 0x40]);
    blit(n - 8, 0, 8, 9, [0x100, 0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x7f]);
    blit(
      0,
      n - 8,
      9,
      8,
      [0xfe, 0x82, 0xba, 0xba, 0xba, 0x82, 0xfe, 0x00, 0x00]
    );

    // The rest of timing patterns
    for (let i = 9; i < n - 8; ++i) {
      matrix[6][i] = matrix[i][6] = ~i & 1;
      reserved[6][i] = reserved[i][6] = 1;
    }

    // Alignment patterns
    if (!v) {
      throw new Error("Invalid version");
    }

    const aligns = v[2];
    const m = aligns.length;

    for (let i = 0; i < m; ++i) {
      const minj = i == 0 || i == m - 1 ? 1 : 0;
      const maxj = i == 0 ? m - 1 : m;

      for (let j = minj; j < maxj; ++j) {
        blit(aligns[i], aligns[j], 5, 5, [0x1f, 0x11, 0x15, 0x11, 0x1f]);
      }
    }

    // Version information
    if (needsVersionInfo(ver)) {
      const code = augumentBch(ver, 6, 0x1f25, 12);
      let k = 0;
      for (let i = 0; i < 6; ++i) {
        for (let j = 0; j < 3; ++j) {
          matrix[i][n - 11 + j] = matrix[n - 11 + j][i] = (code >> k++) & 1;
          reserved[i][n - 11 + j] = reserved[n - 11 + j][i] = 1;
        }
      }
    }

    return { matrix: matrix, reserved: reserved };
  };

  /**
   * Fills the data portion (i.e. unmarked in reserved) of the matrix with given
   * code words. The size of code words should be no more than available bits,
   * and remaining bits are padded to 0 (cf. JIS X 0510:2004 sec 8.7.3).
   */
  const fillInData = (
    matrix: number[][],
    reserved: number[][],
    buf: number[]
  ) => {
    const n = matrix.length;
    let k = 0;
    let dir = -1;

    for (let i = n - 1; i >= 0; i -= 2) {
      if (i == 6) --i; // Skip the entire timing pattern column

      let jj = dir < 0 ? n - 1 : 0;
      for (let j = 0; j < n; ++j) {
        for (let ii = i; ii > i - 2; --ii) {
          if (!reserved[jj][ii]) {
            // may overflow, but (undefined >> x)
            // is 0 so it will auto-pad to zero.
            matrix[jj][ii] = (buf[k >> 3] >> (~k & 7)) & 1;
            ++k;
          }
        }

        jj += dir;
      }

      dir = -dir;
    }

    return matrix;
  };

  /**
   * XOR-masks the data portion of the matrix. Repeating the call with the same
   * arguments will revert the prior call (convenient in the matrix evaluation).
   */
  const maskData = (matrix: number[][], reserved: number[][], mask: number) => {
    const maskf = MASKFUNCS[mask];
    const n = matrix.length;

    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        if (!reserved[i][j]) matrix[i][j] ^= Number(maskf(i, j));
      }
    }

    return matrix;
  };

  /** Fills in the format information. */
  const fillFormatInfo = (
    matrix: number[][],
    ecclevel: number,
    mask: number
  ) => {
    const n = matrix.length;
    const code = augumentBch((ecclevel << 3) | mask, 5, 0x537, 10) ^ 0x5412;

    for (let i = 0; i < 15; ++i) {
      const r = [
        0,
        1,
        2,
        3,
        4,
        5,
        7,
        8,
        n - 7,
        n - 6,
        n - 5,
        n - 4,
        n - 3,
        n - 2,
        n - 1,
      ][i];
      const c = [
        n - 1,
        n - 2,
        n - 3,
        n - 4,
        n - 5,
        n - 6,
        n - 7,
        n - 8,
        7,
        5,
        4,
        3,
        2,
        1,
        0,
      ][i];

      matrix[r][8] = matrix[8][c] = (code >> i) & 1;
      // We don't have to mark those bits reserved; always done
      // in makeBaseMatrix above.
    }

    return matrix;
  };

  /**
   * Evaluates the resulting matrix and returns the score (lower is better).
   * (cf. JIS X 0510:2004 sec 8.8.2)
   *
   * The evaluation procedure tries to avoid the problematic patterns naturally
   * occurring from the original matrix. For example, it penalizes the patterns
   * which just look like the finder pattern which will confuse the decoder.
   * We choose the mask which results in the lowest score among 8 possible ones.
   *
   * Note: ZXing seems to use the same procedure and in many cases its choice
   * agrees to ours, but sometimes it does not. Practically it doesn't matter.
   */
  const evaluatematrix = (matrix: number[][]) => {
    // N1+(k-5) points for each consecutive row of k same-colored modules,
    // where k >= 5. no overlapping row counts.
    const PENALTY_CONSECUTIVE = 3;
    // N2 points for each 2x2 block of same-colored modules.
    // overlapping block does count.
    const PENALTY_TWOBYTWO = 3;
    // N3 points for each pattern with >4W:1B:1W:3B:1W:1B or
    // 1B:1W:3B:1W:1B:>4W, or their multiples (e.g. highly unlikely,
    // but 13W:3B:3W:9B:3W:3B counts).
    const PENALTY_FINDERLIKE = 40;
    // N4*k points for every (5*k)% deviation from 50% black density.
    // i.e. k=1 for 55~60% and 40~45%, k=2 for 60~65% and 35~40%, etc.
    const PENALTY_DENSITY = 10;

    const evaluategroup = (groups: number[]) => {
      // assumes [W,B,W,B,W,...,B,W]
      let score = 0;
      for (let i = 0; i < groups.length; ++i) {
        if (groups[i] >= 5) score += PENALTY_CONSECUTIVE + (groups[i] - 5);
      }
      for (let i = 5; i < groups.length; i += 2) {
        const p = groups[i];
        if (
          groups[i - 1] == p &&
          groups[i - 2] == 3 * p &&
          groups[i - 3] == p &&
          groups[i - 4] == p &&
          (groups[i - 5] >= 4 * p || groups[i + 1] >= 4 * p)
        ) {
          // this part differs from zxing...
          score += PENALTY_FINDERLIKE;
        }
      }
      return score;
    };

    const n = matrix.length;
    let score = 0,
      nblacks = 0;
    for (let i = 0; i < n; ++i) {
      const row = matrix[i];
      let groups;

      // evaluate the current row
      groups = [0]; // the first empty group of white
      for (let j = 0; j < n; ) {
        let k;
        for (k = 0; j < n && row[j]; ++k) ++j;
        groups.push(k);
        for (k = 0; j < n && !row[j]; ++k) ++j;
        groups.push(k);
      }
      score += evaluategroup(groups);

      // evaluate the current column
      groups = [0];
      for (let j = 0; j < n; ) {
        let k;
        for (k = 0; j < n && matrix[j][i]; ++k) ++j;
        groups.push(k);
        for (k = 0; j < n && !matrix[j][i]; ++k) ++j;
        groups.push(k);
      }
      score += evaluategroup(groups);

      // check the 2x2 box and calculate the density
      const nextrow = matrix[i + 1] || [];
      nblacks += row[0];
      for (let j = 1; j < n; ++j) {
        const p = row[j];
        nblacks += p;
        // at least comparison with next row should be strict...
        if (row[j - 1] == p && nextrow[j] === p && nextrow[j - 1] === p) {
          score += PENALTY_TWOBYTWO;
        }
      }
    }

    score += PENALTY_DENSITY * ((Math.abs(nblacks / n / n - 0.5) / 0.05) | 0);
    return score;
  };

  /**
   * Returns the fully encoded QR code matrix which contains given data.
   * It also chooses the best mask automatically when mask is -1.
   */
  const generate = (
    data: string,
    ver: number,
    mode: number,
    ecclevel: number,
    mask: number
  ) => {
    const v = VERSIONS[ver];
    let buf = encode(ver, mode, data, nDataBits(ver, ecclevel) >> 3);
    if (!v) {
      throw new Error("Invalid version");
    }
    buf = augumentEccs(buf, v[1][ecclevel], GF256_GENPOLY[v[0][ecclevel]]);

    const result = makeBaseMatrix(ver);
    const matrix = result.matrix,
      reserved = result.reserved;
    fillInData(matrix, reserved, buf);

    if (mask < 0) {
      // find the best mask
      maskData(matrix, reserved, 0);
      fillFormatInfo(matrix, ecclevel, 0);
      let bestmask = 0,
        bestscore = evaluatematrix(matrix);
      maskData(matrix, reserved, 0);
      for (mask = 1; mask < 8; ++mask) {
        maskData(matrix, reserved, mask);
        fillFormatInfo(matrix, ecclevel, mask);
        const score = evaluatematrix(matrix);
        if (bestscore > score) {
          bestscore = score;
          bestmask = mask;
        }
        maskData(matrix, reserved, mask);
      }
      mask = bestmask;
    }

    maskData(matrix, reserved, mask);
    fillFormatInfo(matrix, ecclevel, mask);
    return matrix;
  };

  type Options = {
    modulesize?: number; // Size of each module in pixels, defaults to 5px
    margin?: null; // Margin in modules, defaults to 4 and shouldn't be less
    version: number; // Integer in range [1, 40], when omitted, the smalles possible value is chosen
    mode?: "numeric" | "alphanumeric" | "octet";
    ecclevel: "L" | "M" | "Q" | "H";
    mask: number;
  };

  const QRCode = {
    generate: (
      data: string,
      options: Options = { version: -1, mask: -1, ecclevel: "L" }
    ) => {
      const MODES = {
        numeric: MODE_NUMERIC,
        alphanumeric: MODE_ALPHANUMERIC,
        octet: MODE_OCTET,
      };

      const ECCLEVELS = {
        L: ECCLEVEL_L,
        M: ECCLEVEL_M,
        Q: ECCLEVEL_Q,
        H: ECCLEVEL_H,
      };

      let ver = options.version;
      const mask = options.mask;
      const ecclevel = ECCLEVELS[options.ecclevel];
      let mode = options.mode ? MODES[options.mode] : -1;

      // If no mode was defined, auto-select the mode
      if (mode < 0) {
        mode = MODE_OCTET; // Default to octet

        if (typeof data === "string") {
          if (data.match(NUMERIC_REGEXP)) {
            mode = MODE_NUMERIC;
          } else if (data.match(ALPHANUMERIC_OUT_REGEXP)) {
            // Upper-case alphanumeric characters only
            mode = MODE_ALPHANUMERIC;
          }
        }
      }

      const validated = validateData(mode, data);
      if (validated === null || validated === undefined) {
        throw "invalid data format";
      }

      data = validated as string;

      if (ver < 0) {
        for (ver = 1; ver <= 40; ++ver) {
          if (data.length <= getMaxDataLength(ver, mode, ecclevel)) break;
        }
        if (ver > 40) throw "Input data is too large";
      } else if (ver < 1 || ver > 40) {
        throw "Invalid version";
      }

      if (mask != -1 && (mask < 0 || mask > 8)) {
        throw "Invalid mask";
      }

      return generate(data, ver, mode, ecclevel, mask ?? -1);
    },
  };

  return QRCode;
})();

export default QRCode;
