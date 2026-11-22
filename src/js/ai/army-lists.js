/*
 * Reading a pasted army list
 *
 * A list pasted into a lobby is read when it was copied from the Para Bellum app; any other list is refused, and
 * the army can be built in the army builder instead.
 *
 * In this file: PB_ONLY, convertList()
 */

const PB_ONLY =
  'Only lists copied from the Para Bellum app can be read. Build your army here instead, or import it in the army builder.';

function convertList(text) {
  const L = typeof pbToList === 'function' ? pbToList(text) : null;
  if (!L) throw { code: 'not_pb' };
  return L;
}
