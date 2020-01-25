export function arrayContainsDuplicates<T>(
	array: T[],
	keyToCompare: keyof T,
	entriesAreTheSame: (a: T, b: T) => boolean
): { duplicatesExist: boolean; duplicates?: T[] } {
	const duplicates: T[] = [];

	if (array.length === 0) {
		return { duplicatesExist: false };
	}

	for (let i = 0; i < array.length - 1; i++) {
		for (let j = i + 1; j < array.length; j++) {
			if (i === j) {
				continue;
			}

			const childI = array[i];
			const childJ = array[j];

			if (childI[keyToCompare] && childJ[keyToCompare]) {
				if (entriesAreTheSame(childI, childJ) && !duplicates.includes(childJ)) {
					duplicates.push({ ...childJ, original: childI });
				}
			}
		}
	}

	return duplicates.length === 0
		? { duplicatesExist: false }
		: { duplicatesExist: true, duplicates: duplicates };
}
