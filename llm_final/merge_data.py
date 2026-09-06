#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""合并教师数据(v2) + CodeAlpaca 开源样本 -> 最终训练集 train.jsonl"""
import json, random

random.seed(42)

teacher = []
with open('/root/llm/finetune/data_teacher_v2.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            teacher.append(json.loads(line))

code = []
with open('/root/llm/finetune/codealpaca/CodeAlpaca-20k.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        text = (d.get('instruction', '') + ' ' + d.get('output', '')).lower()
        if ('python' in text or 'write a' in text or 'function' in text or 'program' in text) \
           and len(d.get('output', '')) < 600 and len(d.get('instruction', '')) < 300:
            code.append({'instruction': d['instruction'], 'output': d['output']})

random.shuffle(code)
code_sample = code[:100]
print(f'教师数据: {len(teacher)} 条, CodeAlpaca 候选: {len(code)} 条, 选取: {len(code_sample)} 条')

all_data = teacher + code_sample
with open('/root/llm/finetune/train.jsonl', 'w', encoding='utf-8') as f:
    for d in all_data:
        f.write(json.dumps(d, ensure_ascii=False) + '\n')
print(f'最终训练集: {len(all_data)} 条 -> /root/llm/finetune/train.jsonl')
