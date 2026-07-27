// Expands the `inset` shorthand into top/right/bottom/left longhands for old Safari

const LONGHANDS = ['top', 'right', 'bottom', 'left'];

// Splits a declaration value on top-level whitespace, keeping parenthesised and quoted
// sections intact so that values such as `calc(1px + 2px) 0` yield two tokens.
const splitTopLevel = value => {
	const tokens = [];
	let current = '';
	let depth = 0;
	let quote = null;

	for (let i = 0; i < value.length; i++) {
		const char = value[i];

		if (quote) {
			if (char === '\\') {
				current += char + (value[++i] ?? '');
				continue;
			}
			current += char;
			if (char === quote) {
				quote = null;
			}
			continue;
		}

		if (char === '"' || char === '\'') {
			quote = char;
			current += char;
			continue;
		}

		if (char === '(') {
			depth += 1;
			current += char;
			continue;
		}

		if (char === ')') {
			depth -= 1;
			current += char;
			continue;
		}

		if (depth === 0 && /\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = '';
			}
			continue;
		}

		current += char;
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
};

// Maps 1--4 shorthand tokens onto [top, right, bottom, left].
const toSides = tokens => {
	switch (tokens.length) {
		case 1:
			return [tokens[0], tokens[0], tokens[0], tokens[0]];
		case 2:
			return [tokens[0], tokens[1], tokens[0], tokens[1]];
		case 3:
			return [tokens[0], tokens[1], tokens[2], tokens[1]];
		case 4:
			return tokens;
		default:
			return null;
	}
};

const plugin = () => ({
	postcssPlugin: 'postcss-expand-inset',
	Declaration: {
		inset: (decl, { result }) => {
			const tokens = splitTopLevel(decl.value);
			const sides = toSides(tokens);

			if (!sides) {
				decl.warn(result, `Expected 1 to 4 values in \`inset: ${decl.value}\`, got ${tokens.length}; left as is`);
				return;
			}

			// A lone var() may itself hold several values, so the side it maps to is unknowable here.
			if (tokens.length === 1 && tokens[0].includes('var(')) {
				decl.warn(result, `Cannot expand \`inset: ${decl.value}\`: a single var() may hold more than one value; left as is`);
				return;
			}

			LONGHANDS.forEach((prop, index) => decl.cloneBefore({ prop, value: sides[index] }));
			decl.remove();
		}
	}
});

plugin.postcss = true;

export default plugin;
