/*
 * pathUtils.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pathUtils module.
 */

import assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as nodefs from 'fs-extra';

import { expandPathVariables } from '../common/envVarUtils';
import {
    changeAnyExtension,
    combinePathComponents,
    combinePaths,
    containsPath,
    convertUriToPath,
    deduplicateFolders,
    ensureTrailingDirectorySeparator,
    getAnyExtensionFromPath,
    getBaseFileName,
    getFileExtension,
    getFileName,
    getPathComponents,
    getRelativePath,
    getRelativePathFromDirectory,
    getWildcardRegexPattern,
    getWildcardRoot,
    hasTrailingDirectorySeparator,
    isDirectoryWildcardPatternPresent,
    isFileSystemCaseSensitiveInternal,
    isRootedDiskPath,
    normalizeSlashes,
    reducePathComponents,
    resolvePaths,
    stripFileExtension,
    stripTrailingDirectorySeparator,
} from '../common/pathUtils';
import * as vfs from './harness/vfs/filesystem';
import { createFromRealFileSystem } from '../common/realFileSystem';

test('getPathComponents1', () => {
    const components = getPathComponents('');
    assert.equal(components.length, 1);
    assert.equal(components[0], '');
});

test('getPathComponents2', () => {
    const components = getPathComponents('/users/');
    assert.equal(components.length, 2);
    assert.equal(components[0], path.sep);
    assert.equal(components[1], 'users');
});

test('getPathComponents3', () => {
    const components = getPathComponents('/users/hello.py');
    assert.equal(components.length, 3);
    assert.equal(components[0], path.sep);
    assert.equal(components[1], 'users');
    assert.equal(components[2], 'hello.py');
});

test('getPathComponents4', () => {
    const components = getPathComponents('/users/hello/../');
    assert.equal(components.length, 2);
    assert.equal(components[0], path.sep);
    assert.equal(components[1], 'users');
});

test('getPathComponents5', () => {
    const components = getPathComponents('./hello.py');
    assert.equal(components.length, 2);
    assert.equal(components[0], '');
    assert.equal(components[1], 'hello.py');
});

test('combinePaths1', () => {
    const p = combinePaths('/user', '1', '2', '3');
    assert.equal(p, normalizeSlashes('/user/1/2/3'));
});

test('ensureTrailingDirectorySeparator1', () => {
    const p = ensureTrailingDirectorySeparator('hello');
    assert.equal(p, normalizeSlashes('hello/'));
});

test('hasTrailingDirectorySeparator1', () => {
    assert(!hasTrailingDirectorySeparator('hello'));
    assert(hasTrailingDirectorySeparator('hello/'));
    assert(hasTrailingDirectorySeparator('hello\\'));
});

test('stripTrailingDirectorySeparator1', () => {
    const path = stripTrailingDirectorySeparator('hello/');
    assert.equal(path, 'hello');
});

test('getFileExtension1', () => {
    const ext = getFileExtension('blah.blah/hello.JsOn');
    assert.equal(ext, '.JsOn');
});

test('getFileExtension2', () => {
    const ext1 = getFileExtension('blah.blah/hello.cpython-32m.so', true);
    assert.equal(ext1, '.cpython-32m.so');
    const ext2 = getFileExtension('blah.blah/hello.cpython-32m.so', false);
    assert.equal(ext2, '.so');
});

test('getFileName1', () => {
    const fileName = getFileName('blah.blah/HeLLo.JsOn');
    assert.equal(fileName, 'HeLLo.JsOn');
});

test('getFileName2', () => {
    const fileName1 = getFileName('blah.blah/hello.cpython-32m.so');
    assert.equal(fileName1, 'hello.cpython-32m.so');
});

test('stripFileExtension1', () => {
    const path = stripFileExtension('blah.blah/HeLLo.JsOn');
    assert.equal(path, 'blah.blah/HeLLo');
});

test('stripFileExtension2', () => {
    const path1 = stripFileExtension('blah.blah/hello.cpython-32m.so', true);
    assert.equal(path1, 'blah.blah/hello');
    const path2 = stripFileExtension('blah.blah/hello.cpython-32m.so', false);
    assert.equal(path2, 'blah.blah/hello.cpython-32m');
});

function fixSeparators(linuxPath: string) {
    if (path.sep === '\\') {
        return linuxPath.replace(/\//g, path.sep);
    }
    return linuxPath;
}

test('getWildcardRegexPattern1', () => {
    const pattern = getWildcardRegexPattern('/users/me', './blah/');
    const regex = new RegExp(pattern);
    assert.ok(regex.test(fixSeparators('/users/me/blah/d')));
    assert.ok(!regex.test(fixSeparators('/users/me/blad/d')));
});

test('getWildcardRegexPattern2', () => {
    const pattern = getWildcardRegexPattern('/users/me', './**/*.py?');
    const regex = new RegExp(pattern);
    assert.ok(regex.test(fixSeparators('/users/me/.blah/foo.pyd')));
    assert.ok(!regex.test(fixSeparators('/users/me/.blah/foo.py'))); // No char after
});

test('getWildcardRegexPattern3', () => {
    const pattern = getWildcardRegexPattern('/users/me', './**/.*.py');
    const regex = new RegExp(pattern);
    assert.ok(regex.test(fixSeparators('/users/me/.blah/.foo.py')));
    assert.ok(!regex.test(fixSeparators('/users/me/.blah/foo.py')));
});

test('isDirectoryWildcardPatternPresent1', () => {
    const isPresent = isDirectoryWildcardPatternPresent('./**/*.py');
    assert.equal(isPresent, true);
});

test('isDirectoryWildcardPatternPresent2', () => {
    const isPresent = isDirectoryWildcardPatternPresent('./**/a/*.py');
    assert.equal(isPresent, true);
});

test('isDirectoryWildcardPatternPresent3', () => {
    const isPresent = isDirectoryWildcardPatternPresent('./**/@tests');
    assert.equal(isPresent, true);
});

test('isDirectoryWildcardPatternPresent4', () => {
    const isPresent = isDirectoryWildcardPatternPresent('./**/test/test*');
    assert.equal(isPresent, true);
});

test('getWildcardRoot1', () => {
    const p = getWildcardRoot('/users/me', './blah/');
    assert.equal(p, normalizeSlashes('/users/me/blah'));
});

test('getWildcardRoot2', () => {
    const p = getWildcardRoot('/users/me', './**/*.py?/');
    assert.equal(p, normalizeSlashes('/users/me'));
});

test('getWildcardRoot with root', () => {
    const p = getWildcardRoot('/', '.');
    assert.equal(p, normalizeSlashes('/'));
});

test('getWildcardRoot with drive letter', () => {
    const p = getWildcardRoot('c:/', '.');
    assert.equal(p, normalizeSlashes('c:'));
});

test('reducePathComponentsEmpty', () => {
    assert.equal(reducePathComponents([]).length, 0);
});

test('reducePathComponents', () => {
    assert.deepEqual(reducePathComponents(getPathComponents('/a/b/../c/.')), [path.sep, 'a', 'c']);
});

test('combinePathComponentsEmpty', () => {
    assert.equal(combinePathComponents([]), '');
});

test('combinePathComponentsAbsolute', () => {
    assert.equal(combinePathComponents(['/', 'a', 'b']), normalizeSlashes('/a/b'));
});

test('combinePathComponents', () => {
    assert.equal(combinePathComponents(['a', 'b']), normalizeSlashes('a/b'));
});

test('resolvePath1', () => {
    assert.equal(resolvePaths('/path', 'to', 'file.ext'), normalizeSlashes('/path/to/file.ext'));
});

test('resolvePath2', () => {
    assert.equal(resolvePaths('/path', 'to', '..', 'from', 'file.ext/'), normalizeSlashes('/path/from/file.ext/'));
});

test('resolvePath3 ~ escape', () => {
    const homedir = os.homedir();
    assert.equal(
        resolvePaths(expandPathVariables('', '~/path'), 'to', '..', 'from', 'file.ext/'),
        normalizeSlashes(`${homedir}/path/from/file.ext/`)
    );
});

test('resolvePath4 ~ escape in middle', () => {
    const homedir = os.homedir();
    assert.equal(
        resolvePaths('/path', expandPathVariables('', '~/file.ext/')),
        normalizeSlashes(`${homedir}/file.ext/`)
    );
});

test('invalid ~ without root', () => {
    const path = combinePaths('Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Development', 'mysuperproject');
    assert.equal(resolvePaths(expandPathVariables('/src', path)), path);
});

test('invalid ~ with root', () => {
    const path = combinePaths('/', 'Library', 'com~apple~CloudDocs', 'Development', 'mysuperproject');
    assert.equal(resolvePaths(expandPathVariables('/src', path)), path);
});

test('containsPath1', () => {
    assert.equal(containsPath('/a/b/c/', '/a/d/../b/c/./d'), true);
});

test('containsPath2', () => {
    assert.equal(containsPath('/', '\\a'), true);
});

test('containsPath3', () => {
    assert.equal(containsPath('/a', '/A/B', true), true);
});

test('changeAnyExtension1', () => {
    assert.equal(changeAnyExtension('/path/to/file.ext', '.js', ['.ext', '.ts'], true), '/path/to/file.js');
});

test('changeAnyExtension2', () => {
    assert.equal(changeAnyExtension('/path/to/file.ext', '.js'), '/path/to/file.js');
});

test('changeAnyExtension3', () => {
    assert.equal(changeAnyExtension('/path/to/file.ext', '.js', '.ts', false), '/path/to/file.ext');
});

test('changeAnyExtension1', () => {
    assert.equal(getAnyExtensionFromPath('/path/to/file.ext'), '.ext');
});

test('changeAnyExtension2', () => {
    assert.equal(getAnyExtensionFromPath('/path/to/file.ext', '.ts', true), '');
});

test('changeAnyExtension3', () => {
    assert.equal(getAnyExtensionFromPath('/path/to/file.ext', ['.ext', '.ts'], true), '.ext');
});

test('getBaseFileName1', () => {
    assert.equal(getBaseFileName('/path/to/file.ext'), 'file.ext');
});

test('getBaseFileName2', () => {
    assert.equal(getBaseFileName('/path/to/'), 'to');
});

test('getBaseFileName3', () => {
    assert.equal(getBaseFileName('c:/'), '');
});

test('getBaseFileName4', () => {
    assert.equal(getBaseFileName('/path/to/file.ext', ['.ext'], true), 'file');
});

test('getRelativePathFromDirectory1', () => {
    assert.equal(getRelativePathFromDirectory('/a', '/a/b/c/d', true), normalizeSlashes('b/c/d'));
});

test('getRelativePathFromDirectory2', () => {
    assert.equal(getRelativePathFromDirectory('/a', '/b/c/d', true), normalizeSlashes('../b/c/d'));
});

test('isRootedDiskPath1', () => {
    assert(isRootedDiskPath(normalizeSlashes('C:/a/b')));
});

test('isRootedDiskPath2', () => {
    assert(isRootedDiskPath(normalizeSlashes('/')));
});

test('isRootedDiskPath3', () => {
    assert(!isRootedDiskPath(normalizeSlashes('a/b')));
});

test('isDiskPathRoot1', () => {
    assert(isRootedDiskPath(normalizeSlashes('/')));
});

test('isDiskPathRoot2', () => {
    assert(isRootedDiskPath(normalizeSlashes('c:/')));
});

test('isDiskPathRoot3', () => {
    assert(!isRootedDiskPath(normalizeSlashes('c:')));
});

test('getRelativePath', () => {
    assert.equal(
        getRelativePath(normalizeSlashes('/a/b/c/d/e/f'), normalizeSlashes('/a/b/c')),
        normalizeSlashes('./d/e/f')
    );
});

test('CaseSensitivity', () => {
    const cwd = normalizeSlashes('/');

    const fsCaseInsensitive = new vfs.TestFileSystem(/*ignoreCase*/ true, { cwd });
    assert.equal(isFileSystemCaseSensitiveInternal(fsCaseInsensitive), false);

    const fsCaseSensitive = new vfs.TestFileSystem(/*ignoreCase*/ false, { cwd });
    assert.equal(isFileSystemCaseSensitiveInternal(fsCaseSensitive), true);
});

test('deduplicateFolders', () => {
    const listOfFolders = [
        ['/user', '/user/temp', '/xuser/app', '/lib/python', '/home/p/.venv/lib/site-packages'],
        ['/user', '/user/temp', '/xuser/app', '/lib/python/Python310.zip', '/home/z/.venv/lib/site-packages'],
        ['/main/python/lib/site-packages', '/home/p'],
    ];

    const folders = deduplicateFolders(listOfFolders);

    const expected = [
        '/user',
        '/xuser/app',
        '/lib/python',
        '/home/z/.venv/lib/site-packages',
        '/main/python/lib/site-packages',
        '/home/p',
    ];

    assert.deepStrictEqual(folders.sort(), expected.sort());
});

test('convert UNC path', () => {
    const cwd = normalizeSlashes('/');
    const fs = new vfs.TestFileSystem(/*ignoreCase*/ true, { cwd });

    const path = convertUriToPath(fs, 'file://server/c$/folder/file.py');

    // When converting UNC path, server part shouldn't be removed.
    assert(path.indexOf('server') > 0);
});

test('Realcase', () => {
    const fs = createFromRealFileSystem();
    const cwd = process.cwd();
    const dir = path.join(cwd, 'src', 'tests');
    const entries = nodefs.readdirSync(dir).map((entry) => path.basename(nodefs.realpathSync(path.join(dir, entry))));
    const fsentries = fs.readdirSync(dir);
    assert.deepStrictEqual(entries, fsentries);

    const paths = entries.map((entry) => nodefs.realpathSync(path.join(dir, entry)));
    const fspaths = fsentries.map((entry) => fs.realCasePath(path.join(dir, entry)));
    assert.deepStrictEqual(paths, fspaths);
});
