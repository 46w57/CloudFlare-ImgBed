#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
评测脚本: 加载 base 或 lora 模型, 回答 9 科试卷, 保存答案到 jsonl
用法: python run_eval.py base out_base.jsonl
      python run_eval.py lora out_lora.jsonl
"""
import json, os, sys, time, glob
import torch
torch.set_num_threads(3)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE = "/root/llm/models/hf_Qwen3-1.7B"
ADAPTER = "/root/llm/finetune/lora_out_v2"
EXAMS = "/root/llm/exams"

def load_model(mode):
    t0 = time.time()
    model = AutoModelForCausalLM.from_pretrained(
        BASE, torch_dtype=torch.bfloat16, low_cpu_mem_usage=True, device_map="cpu")
    tok = AutoTokenizer.from_pretrained(BASE)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    if mode == "lora":
        from peft import PeftModel
        model = PeftModel.from_pretrained(model, ADAPTER)
        model.eval()
    print(f"[{mode}] 模型加载完成 {time.time()-t0:.1f}s", flush=True)
    return model, tok

def prompt_for(q):
    subject = q["subject"]
    question = q["question"]
    options = q.get("options") or {}
    if options:
        optstr = "  ".join(f"{k}. {v}" for k, v in sorted(options.items()))
        user = (f"你是考生，请回答下面的初中{subject}选择题。\n题目：{question}\n"
                f"选项：{optstr}\n请只写出你选的选项字母（如 A、B、C、D）。")
        is_choice = True
        max_new = 48
    else:
        user = (f"你是考生，请回答下面的初中{subject}填空题。\n题目：{question}\n"
                f"请直接写出答案，不要解释。")
        is_choice = False
        max_new = 64
    return user, is_choice, max_new

def gen(model, tok, user, max_new):
    sys_c = "你是 Qwen，一个乐于助人的 AI 助手。"
    text = (f"<|im_start|>system\n{sys_c}<|im_end|>\n"
            f"<|im_start|>user\n{user}<|im_end|>\n"
            f"<|im_start|>assistant\n thinking\n\n response\n\n")
    ids = tok(text, add_special_tokens=False)["input_ids"]
    input_ids = torch.tensor([ids], dtype=torch.long)
    with torch.no_grad():
        out = model.generate(input_ids=input_ids, max_new_tokens=max_new,
                             do_sample=False, pad_token_id=tok.eos_token_id)
    new = out[0][len(ids):]
    return tok.decode(new, skip_special_tokens=True).strip()

def main():
    mode = sys.argv[1]
    outfile = sys.argv[2]
    model, tok = load_model(mode)
    rows = []
    for fp in sorted(glob.glob(os.path.join(EXAMS, "exam_*.jsonl"))):
        for line in open(fp, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            q = json.loads(line)
            user, is_choice, max_new = prompt_for(q)
            t0 = time.time()
            ans = gen(model, tok, user, max_new)
            rec = dict(q)
            rec["model_answer"] = ans
            rec["is_choice"] = is_choice
            rows.append(rec)
            print(f"[{mode}] {q['subject']} | {q['question'][:16]}... -> {ans[:40]!r} ({time.time()-t0:.1f}s)", flush=True)
    with open(outfile, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"== 完成 {mode} 共 {len(rows)} 题 -> {outfile}", flush=True)

if __name__ == "__main__":
    main()
