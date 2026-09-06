#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Qwen3-1.7B CPU LoRA 微调（蒸馏式微调）: bf16 + gradient_checkpointing + batch=1"""
import json, os, gc, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model

torch.set_num_threads(3)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

BASE = "/root/llm/models/hf_Qwen3-1.7B"
DATA = "/root/llm/finetune/train.jsonl"
OUT = "/root/llm/finetune/lora_out_v2"
MAX_LEN = 384
LR = 2e-4
EPOCHS = 1

def mem():
    try:
        return round(int(open('/sys/fs/cgroup/memory.current').read())/1e6, 0)
    except Exception:
        return -1

def build_samples(tokenizer):
    samples = []
    with open(DATA, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            msgs = [
                {"role": "system", "content": "你是 Qwen，一个乐于助人的 AI 助手。"},
                {"role": "user", "content": d["instruction"]},
                {"role": "assistant", "content": d["output"]},
            ]
            text = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False)
            enc = tokenizer(text, add_special_tokens=False, truncation=True, max_length=MAX_LEN)
            ids = enc["input_ids"]
            marker = tokenizer.convert_tokens_to_ids("<|im_start|>")
            labels = [-100] * len(ids)
            start = None
            for i in range(len(ids) - 1):
                if ids[i] == marker:
                    start = i
            if start is not None:
                for i in range(start, len(ids)):
                    labels[i] = ids[i]
            samples.append((torch.tensor([ids], dtype=torch.long),
                            torch.tensor([labels], dtype=torch.long)))
    return samples

def main():
    print(f"== 加载模型 {BASE} ==", flush=True)
    t0 = time.time()
    model = AutoModelForCausalLM.from_pretrained(
        BASE, torch_dtype=torch.bfloat16, low_cpu_mem_usage=True,
        device_map="cpu", use_cache=False,
    )
    print(f"  模型加载完成 {time.time()-t0:.1f}s, 内存 {mem()}MB", flush=True)
    tok = AutoTokenizer.from_pretrained(BASE)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    print("== 配置 LoRA ==", flush=True)
    lora = LoraConfig(
        r=8, lora_alpha=16, lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora)
    model.gradient_checkpointing_enable()
    model.enable_input_require_grads()
    model.train()
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  可训练参数: {trainable/1e6:.2f}M / 总 {total/1e9:.2f}B", flush=True)

    samples = build_samples(tok)
    print(f"== 训练样本 {len(samples)} 条, {EPOCHS} epoch ==", flush=True)

    opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=LR)

    t_start = time.time()
    for epoch in range(EPOCHS):
        for i, (ids, labels) in enumerate(samples):
            opt.zero_grad()
            out = model(input_ids=ids, labels=labels)
            loss = out.loss
            loss.backward()
            opt.step()
            if (i + 1) % 10 == 0 or i == 0 or i == len(samples) - 1:
                spd = (time.time() - t_start) / (i + 1)
                print(f"  epoch {epoch+1} step {i+1}/{len(samples)} loss={loss.item():.4f} "
                      f"({spd:.1f}s/step, 剩余约 {(len(samples)-i-1)*spd/60:.0f}min)", flush=True)
            del out, loss
            gc.collect()
        print(f"== epoch {epoch+1} 完成 ==", flush=True)

    print(f"== 保存 LoRA -> {OUT} ==", flush=True)
    model.save_pretrained(OUT)
    tok.save_pretrained(OUT)
    print("== 微调完成 ==", flush=True)

if __name__ == "__main__":
    main()
