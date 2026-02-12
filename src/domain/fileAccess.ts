export type FileHandle = unknown;

function hasFn(name: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  return typeof g[name] === 'function';
}

export function hasFileSystemAccessApi(): boolean {
  return hasFn('showOpenFilePicker') && hasFn('showSaveFilePicker');
}

export async function openWithFileSystemAccess(): Promise<{ handle: FileHandle; name: string; text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;

  const [handle] = await g.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: 'Griddle files',
        accept: {
          'application/json': ['.griddle', '.json'],
        },
      },
    ],
  });

  const file = await handle.getFile();
  const text = await file.text();

  return { handle, name: file.name, text };
}

export async function saveToHandle(handle: FileHandle, contents: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h: any = handle;
  const writable = await h.createWritable();
  await writable.write(contents);
  await writable.close();
}

export async function saveAsWithFileSystemAccess(args: {
  suggestedName: string;
  contents: string;
}): Promise<{ handle: FileHandle; name: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;

  const handle = await g.showSaveFilePicker({
    suggestedName: args.suggestedName,
    types: [
      {
        description: 'Griddle files',
        accept: { 'application/json': ['.griddle'] },
      },
    ],
  });

  await saveToHandle(handle, args.contents);

  let name = args.suggestedName;
  try {
    // Some implementations expose a name prop.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name = (handle as any).name ?? name;
  } catch {
    // ignore
  }

  return { handle, name };
}
