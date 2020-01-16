export const pureTest = arr => {
  const sum = arr.reduce((r, i) => (r += i), 0);
  const cubes = arr.map(i => i ** 3);
  const sumofcubes1 = arr.map(i => i ** 3).reduce((r, i) => (r += i), 0);
  const sumofcubes2 = cubes.reduce((r, i) => (r += i), 0);
  return sumofcubes1 === sumofcubes2 ? "passed" : "failed";
};
