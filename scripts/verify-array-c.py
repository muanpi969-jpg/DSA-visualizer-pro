"""Compile and exercise the C references without creating repository artifacts."""
from pathlib import Path
import os, re, shutil, subprocess, tempfile
root=Path(__file__).resolve().parents[1] / 'apps/web/lib/algorithms'
temporary=tempfile.TemporaryDirectory(prefix='dsa-c-snippets-')
out=Path(temporary.name)
compiler=os.environ.get('CC') or shutil.which('clang') or shutil.which('cc')
if not compiler: raise SystemExit('Install a C compiler (clang or cc), or set CC.')
functions={
'bubble-sort':'bubbleSort','selection-sort':'selectionSort','insertion-sort':'insertionSort',
'merge-sort':'mergeSort','quick-sort':'quickSort','heap-sort':'heapSort',
'linear-search':'linearSearch','binary-search':'binarySearch','jump-search':'jumpSearch',
'interpolation-search':'interpolationSearch','exponential-search':'exponentialSearch','ternary-search':'ternarySearch',
}
header='''#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static uint32_t seed = 123456789;
static uint32_t next_random(void) { seed = seed * 1664525u + 1013904223u; return seed; }
static int compare(const void *a, const void *b) {
  const double x = *(const double *)a, y = *(const double *)b;
  return (x > y) - (x < y);
}
'''
for slug,fn in functions.items():
    category='sorting' if slug.endswith('sort') else 'search'
    text=(root/category/slug/'definition.ts').read_text()
    snippet=re.search(r'const c = `([\s\S]*?)`;',text).group(1)
    init='''
int main(void) {
  for (int trial = 0; trial < 1200; trial++) {
    const int n = trial % 65;
    double arr[64] = {0};
    for (int i = 0; i < n; i++) {
      switch (trial % 6) {
        case 0: arr[i] = 3.25; break;
        case 1: arr[i] = i * 0.25 - 8; break;
        case 2: arr[i] = 16 - i * 0.25; break;
        default: arr[i] = ((int)(next_random() % 161) - 80) * 0.25; break;
      }
    }
'''
    if category=='sorting':
        call=f'{fn}(arr, 0, n - 1);' if slug in ('merge-sort','quick-sort') else f'{fn}(arr, n);'
        body='''    double expected[64] = {0};
    memcpy(expected, arr, (size_t)n * sizeof(double));
    qsort(expected, (size_t)n, sizeof(double), compare);
    '''+call+'''
    for (int i = 0; i < n; i++) assert(arr[i] == expected[i]);
'''
    else:
        body=('    qsort(arr, (size_t)n, sizeof(double), compare);\n' if slug!='linear-search' else '')+'''    for (int targetCase = -3; targetCase < n; targetCase++) {
      const double target = targetCase == -3 ? -1000000 : targetCase == -2 ? 1000000 : targetCase == -1 ? 0.125 : arr[targetCase];
      int expected = -1;
      for (int i = 0; i < n; i++) if (arr[i] == target) { expected = i; break; }
      const int actual = '''+fn+'''(arr, n, target);
      if (expected == -1) assert(actual == -1);
      else {
        assert(actual >= 0 && actual < n);
        assert(arr[actual] == target);
'''+('        assert(actual == expected);\n' if slug=='linear-search' else '')+'''      }
    }
'''
    actual_header = re.sub(r'static int compare\([\s\S]*?\n}\n', '', header) if slug == 'linear-search' else header
    source=actual_header+snippet+init+body+'  }\n  puts("'+slug+': 1200 edge/randomized inputs passed");\n  return 0;\n}\n'
    cfile=out/(slug+'.c');binary=out/slug;cfile.write_text(source)
    flags=[compiler,'-std=c17','-Wall','-Wextra','-Werror','-pedantic','-fsanitize=address,undefined','-fno-omit-frame-pointer',str(cfile),'-o',str(binary),'-lm']
    result=subprocess.run(flags,text=True,capture_output=True)
    if result.returncode: raise SystemExit(result.stdout+result.stderr)
    result=subprocess.run([str(binary)],text=True,capture_output=True)
    if result.returncode: raise SystemExit(slug+' failed:\n'+result.stdout+result.stderr)
    print(result.stdout.strip())
print('12 snippets compiled with strict C17 warnings and ASan/UBSan; 14,400 generated input sets passed.')

temporary.cleanup()
