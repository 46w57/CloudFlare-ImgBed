#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
代码能力对比: 加载 base 或 lora 模型, 回答 code_test.jsonl 中的代码任务
用法: python run_code_eval.py base out_code_base.jsonl
      python run_code_eval.py lora out_code_lora.jsonl
"""
import json, os, sys, time
import torch
torch.set_num_threads(3)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE = "/root/llm/models/hf_Qwen3-1.7B"
ADAPTER = "/root/llm/finetune/lora_out_v2"
TASKS = "/root/llm/finetune/code_test.jsonl"

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

def main():
    mode = sys.argv[1]
    outfile = sys.argv[2]
    model, tok = load_model(mode)
    rows = []
    for line in open(TASKS, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        user = f"请用 Python 完成下面的编程任务，直接输出完整可运行的代码，不要解释：\n{d['task']}"
        sys_c = "你是 Qwen，一个乐于助人的 AI 助手。"
        text = (f"<|im_start|>system\n{sys_c}<|im_end|>\n"
                f"<|im_start|>user\n{user}<|im_end|>\n"
                f"<|im_start|>assistant\n thinking\n\n response\n\n")
        ids = tok(text, add_special_tokens=False)["input_ids"]
        input_ids = torch.tensor([ids], dtype=torch.long)
        t0 = time.time()
        with torch.no_grad():
            out = model.generate(input_ids=input_ids, max_new_tokens=400,
                                 do_sample=False, pad_token_id=tok.eos_token_id)
        new = out[0][len(ids):]
        ans = tok.decode(new, skip_special_tokens=True).strip()
        rec = dict(d)
        rec["model_answer"] = ans
        rows.append(rec)
        print(f"[{mode}] {d['tag']} | {d['task'][:20]}... ({time.time()-t0:.1f}s)", flush=True)
    with open(outfile, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"== 完成 {mode} 共 {len(rows)} 题 -> {outfile}", flush=True)

if __name__ == "__main__":
    main()
