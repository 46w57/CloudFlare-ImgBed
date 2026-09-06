#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""代码评测: 提取模型生成的代码, 运行隐藏测试用例判定对错
用法: python code_score.py out_code_base.jsonl out_code_lora.jsonl"""
import json, re, sys, contextlib, io

TASKS = {
    "FizzBuzz": {
        "fizzbuzz": [((15,), ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]),
                     ((5,), ["1","2","Fizz","4","Buzz"])],
    },
    "二分查找": {
        "binary_search": [(([1,3,5,7,9],5),2), (([1,3,5,7,9],6),-1), (([2],2),0), (([],1),-1)],
    },
    "合并两个已排序": {
        "merge_sorted": [(([1,3,5],[2,4,6]),[1,2,3,4,5,6]), (([],[1,2]),[1,2]), (([1,2],[1,2]),[1,1,2,2])],
    },
    "统计字符次数": {
        "char_count": [ (("hello",),{"h":1,"e":1,"l":2,"o":1}), (("aab",),{"a":2,"b":1}), (("",),{}) ],
    },
    "括号序列": {
        "is_valid": [ (("()",),True), (("()[]{}",),True), (("(]",),False), (("([)]",),False), (("",),True) ],
    },
    "快速排序": {
        "quicksort": [ (([3,1,2],),[1,2,3]), (([5,5,5],),[5,5,5]), (([],),[]), (([2],),[2]) ],
    },
    "驼峰转下划线": {
        "camel_to_snake": [ (("myName",),"my_name"), (("helloWorld",),"hello_world"), (("ABC",),"a_b_c") ],
    },
    "平均值": {
        "average": [ (([1,2,3],),2.0), (([5],),5.0), (([],),0) ],
    },
    "出现最多的字符": {
        "most_frequent": [ (("aabbbcc",),"b"), (("hello",),"l") ],
    },
    "字典按键排序": {
        "sorted_keys": [ (({"b":1,"a":2,"c":3},),["a","b","c"]), (({},),[]) ],
    },
    "字母异位词": {
        "is_anagram": [ (("anagram","nagaram"),True), (("rat","car"),False), (("",""),True) ],
    },
    "移除重复": {
        "dedup": [ (([1,2,2,3,1],),[1,2,3]), (([],),[]), ((["a","b","a"],),["a","b"]) ],
    },
}

def extract_code(ans):
    if not ans:
        return None
    ans = str(ans).strip()
    idx = ans.find("</think>")
    if idx != -1:
        ans = ans[idx + len("</think>"):]
    ans = re.sub(r"^response\s*", "", ans.strip())
    blocks = re.findall(r"```(?:python)?\s*(.*?)```", ans, re.S)
    if blocks:
        return blocks[0].strip()
    lines = ans.splitlines()
    code_lines = []
    for ln in lines:
        if ln.strip().startswith("#") or (not ln.strip()):
            if code_lines:
                break
            continue
        code_lines.append(ln)
    cand = "\n".join(code_lines)
    try:
        compile(cand, "<gen>", "exec")
        return cand
    except SyntaxError:
        return None

def run_tests(code, task_key):
    if not code:
        return False, "无代码"
    candidates = TASKS[task_key]
    for fname, tests in candidates.items():
        if fname not in code:
            continue
        ns = {}
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(code, "<gen>", "exec"), ns)
        except Exception as e:
            return False, f"执行错误: {type(e).__name__}: {e}"
        fn = ns.get(fname)
        if not callable(fn):
            continue
        for args, exp in tests:
            buf = io.StringIO()
            try:
                with contextlib.redirect_stdout(buf):
                    got = fn(*args)
            except Exception as e:
                return False, f"{fname}{args} 报错: {type(e).__name__}"
            stdout = buf.getvalue().strip()
            if got is None and stdout:
                if isinstance(exp, list):
                    got = stdout.splitlines()
                else:
                    got = stdout
            try:
                if isinstance(exp, float):
                    ok = abs(float(got) - exp) < 1e-9
                elif isinstance(exp, list):
                    ok = list(got) == exp
                elif isinstance(exp, dict):
                    ok = dict(got) == exp
                else:
                    ok = got == exp
            except Exception:
                ok = False
            if not ok:
                return False, f"{fname}{args} 期望{exp!r} 得到{got!r}"
        return True, f"通过({fname})"
    return False, "未找到可调用函数"

def main():
    files = sys.argv[1:]
    results = {}
    for fp in files:
        rows = [json.loads(l) for l in open(fp, encoding="utf-8") if l.strip()]
        ok = 0
        details = []
        for r in rows:
            code = extract_code(r["model_answer"])
            key = None
            for k in TASKS:
                if k in r["task"] or any(name in r["task"] for name in TASKS[k]):
                    key = k
                    break
            if key is None:
                details.append(("?", r["tag"], "未匹配任务"))
                continue
            passed, msg = run_tests(code, key)
            if passed:
                ok += 1
            details.append(("PASS" if passed else "FAIL", r["tag"], msg))
        results[fp] = (ok, len(rows), details)
    print(f"{'模型':<12}{'通过':>6}{'总数':>6}{'通过率':>10}")
    print("-" * 36)
    for fp, (ok, n, det) in results.items():
        tag = fp.replace(".jsonl", "").replace("out_code_", "")
        print(f"{tag:<12}{ok:>6}{n:>6}{ok/n*100:>9.1f}%")
    print()
    if len(files) >= 2:
        base = results[files[0]][2]
        lora = results[files[1]][2]
        print(f"{'结果':<6}{'base':<16}{'lora':<16}{'说明'}")
        for (b, bt, bm), (l, lt, lm) in zip(base, lora):
            mark = "=" if b == l else ("↑" if l == "PASS" else "↓")
            print(f"{mark:<6}{b+' '+bt:<16}{l+' '+lt:<16}{lm if l!='PASS' else ''}")

if __name__ == "__main__":
    main()
