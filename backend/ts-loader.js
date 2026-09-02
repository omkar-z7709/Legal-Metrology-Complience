export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.endsWith('.js')) {
      const tsSpecifier = specifier.slice(0, -3) + '.ts';
      try {
        return await nextResolve(tsSpecifier, context);
      } catch {}
    }
    throw err;
  }
}
