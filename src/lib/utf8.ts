/**
 * calculates the UTF-8 byte length of a string
 *
 * @param str string to measure
 * @returns byte length when encoded as UTF-8
 */
export const getUtf8Length = (str: string): number => {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) len += 1;
    else if (c < 0x800) len += 2;
    else if (c >= 0xd800 && c < 0xe000) {
      len += 4;
      i++;
    } else len += 3;
  }
  return len;
};
