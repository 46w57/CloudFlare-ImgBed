#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""9科判分: 自动比对 + 人工覆盖
用法: python score_final.py [base_file] [lora_file] [base_label] [lora_label]"""
import json, re, sys, unicodedata

def norm(s):
    if s is None: return ""
    return unicodedata.normalize("NFKC", str(s)).replace(" ", "").lower()

def strip_think(a):
    if a is None: return ""
    a = str(a).strip()
    idx = a.find("</think>")
    if idx != -1:
        a = a[idx + len("</think>"):]
    a = re.sub(r"^thinking\s*", "", a.strip(), flags=re.M)
    a = re.sub(r"^response\s*", "", a.strip(), flags=re.M)
    if "thinking" in a or "<|im_end|>" in a:
        parts = re.split(r"<\|im_end\|>", a)
        a = parts[-1] if parts else a
    return a.strip()

def extract_letter(a):
    a = strip_think(a)
    m = re.search(r"(?:选|答案|故选|应选|答案为|选择)?[:：]?\s*([A-D])\b", a)
    if m: return m.group(1)
    m = re.match(r"^\s*([A-D])\b", a)
    if m: return m.group(1)
    letters = [c for c in a.upper() if c in "ABCD"]
    if letters and len(set(letters)) == 1:
        return letters[0]
    return None

OVERRIDES = []

def apply_override(subj, q, tag):
    for s, pref, (b, l) in OVERRIDES:
        if s == subj and pref in q:
            return b if tag == "base" else l
    return -1

def auto_score(r):
    if r["is_choice"]:
        g = norm(r["answer"])
        p = extract_letter(r["model_answer"])
        if p is None:
            return None
        return 1 if p.lower() == g else 0
    else:
        g = norm(r["answer"])
        p = norm(strip_think(r["model_answer"])).strip("（）()\"'“”「」")
        if p == g or (g and (g in p or p in g)):
            return 1
        return 0

def load(fp):
    return [json.loads(l) for l in open(fp, encoding="utf-8") if l.strip()]

def main():
    fbase = sys.argv[1] if len(sys.argv) > 1 else "out_base.jsonl"
    flora = sys.argv[2] if len(sys.argv) > 2 else "out_lora.jsonl"
    lbl_base = sys.argv[3] if len(sys.argv) > 3 else "base"
    lbl_lora = sys.argv[4] if len(sys.argv) > 4 else "lora"
    base = load(fbase)
    lora = load(flora)
    subs = []
    for r in base:
        if r["subject"] not in subs:
            subs.append(r["subject"])
    print(f"{'科目':<7}{lbl_base:>10}{lbl_lora:>10}")
    print("-" * (7 + 10 + 10 + 4))
    tb = tl = 0
    nb = nl = 0
    for s in subs:
        bb = [r for r in base if r["subject"] == s]
        ll = [r for r in lora if r["subject"] == s]
        cb = cl = 0
        for r in bb:
            sc = auto_score(r)
            ov = apply_override(r["subject"], r["question"], "base")
            sc = ov if ov != -1 else (sc if sc is not None else 0)
            cb += sc
        for r in ll:
            sc = auto_score(r)
            ov = apply_override(r["subject"], r["question"], "lora")
            sc = ov if ov != -1 else (sc if sc is not None else 0)
            cl += sc
        tb += cb; tl += cl; nb += len(bb); nl += len(ll)
        print(f"{s:<7}{cb:>4}/{len(bb):<6}{cl:>4}/{len(ll)}")
    print("-" * (7 + 10 + 10 + 4))
    print(f"{'总分':<7}{tb:>4}/{nb:<6}{tl:>4}/{nl}")
    print(f"{'正确率':<7}{tb/nb*100:>8.1f}%{tl/nl*100:>8.1f}%")

if __name__ == "__main__":
    main()
