#!/bin/bash
cd /root/llm/finetune
source venv/bin/activate
echo "==== [1/4] base 9科试卷 ===="
python run_eval.py base out_base.jsonl
echo "==== [2/4] lora 9科试卷 ===="
python run_eval.py lora out_lora.jsonl
echo "==== [3/4] base 代码 ===="
python run_code_eval.py base out_code_base.jsonl
echo "==== [4/4] lora 代码 ===="
python run_code_eval.py lora out_code_lora.jsonl
echo "==== 判分: 9科 ===="
python score_final.py out_base.jsonl out_lora.jsonl base lora
echo "==== 判分: 代码 ===="
python code_score.py out_code_base.jsonl out_code_lora.jsonl
echo "==== ALL DONE ===="
