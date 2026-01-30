export const getRandomHexColor = () => {
  const randomInt = Math.floor(Math.random() * 16777215); // 16777215 is FFFFFF in decimal
  const hexString = randomInt.toString(16);
  return `#${hexString.padStart(6, '0')}`;
};

