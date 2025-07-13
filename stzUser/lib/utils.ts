
export const isEmptyString = (
  aString: string | null | undefined
) => {
  let result = false;
  if (
    aString === '' ||
    aString === undefined ||
    aString === null
  ) {
    result = true;
  }
  return result;
}

