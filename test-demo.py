import json, urllib.request, time

BASE = "http://localhost:3000"

def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type":"application/json"})
    return json.loads(urllib.request.urlopen(req).read())

def get(url):
    return json.loads(urllib.request.urlopen(url).read())

# ===== Test 1: Classic template (央国企) =====
print("━" * 50)
print("① 央国企·经典 模板 — Phase 1")
print("━" * 50)
p1_classic = json.load(open("c:/Users/李芸/resume-optimizer/test-classic.json"))
r1 = post(BASE + "/api/generate", p1_classic)
c1 = json.loads(r1["content"])
print(f"  标题: {c1['简历标题']}")
print(f"  评分: 总分{c1['岗位匹配评分']['总分']} 技能{c1['岗位匹配评分']['技能匹配分']} 经验{c1['岗位匹配评分']['行业经验分']}")
print(f"  技能标签: {c1['专业技能标签']}")
print(f"  实习为空: {c1['实习项目经历'] == []}")
print(f"  全文为空: {c1['优化后完整简历文本'] == ''}")

# ===== Test 2: Internet template (互联网) =====
print("\n" + "━" * 50)
print("② 互联网·现代 模板 — Phase 1")
print("━" * 50)
p1_internet = json.load(open("c:/Users/李芸/resume-optimizer/test-internet.json"))
r2 = post(BASE + "/api/generate", p1_internet)
c2 = json.loads(r2["content"])
print(f"  标题: {c2['简历标题']}")
print(f"  评分: 总分{c2['岗位匹配评分']['总分']} 技能{c2['岗位匹配评分']['技能匹配分']} 经验{c2['岗位匹配评分']['行业经验分']}")
print(f"  技能标签: {c2['专业技能标签']}")

# ===== Test 3: Two-phase full generation =====
print("\n" + "━" * 50)
print("③ 完整两阶段生成")
print("━" * 50)
p2_phase1 = {"phase":1,"template":"en-modern","userData":{"personal":{"name":"陈伟","phone":"13600136000","email":"chenw@email.com","base":"上海","politics":"","status":""},"education":[{"school":"上海交通大学","major":"计算机科学","degree":"本科","gpa":"3.6/4.0","startDate":"2018-09","endDate":"2022-07"}],"work":[{"company":"字节跳动","position":"前端开发","startDate":"2022-08","endDate":"2024-06","description":"使用React+TypeScript开发抖音数据平台，负责性能优化和架构升级"}],"projects":[],"skills":[{"name":"React","proficiency":"精通"},{"name":"TypeScript","proficiency":"熟练"},{"name":"Webpack","proficiency":"熟练"},{"name":"Node.js","proficiency":"熟悉"}],"certificates":[],"schoolActivities":[],"portfolio":[],"rawResume":""},"jdText":"高级前端工程师，精通React、TypeScript，有大型前端架构经验，熟悉Webpack/Vite等构建工具。"}
r3_1 = post(BASE + "/api/generate", p2_phase1)
c3_1 = json.loads(r3_1["content"])
print(f"  Phase 1: 评分{c3_1['岗位匹配评分']['总分']}")

p2_phase2 = {**p2_phase1, "phase": 2, "phase1Result": c3_1}
r3_2 = post(BASE + "/api/generate", p2_phase2)
c3_2 = json.loads(r3_2["content"])
star = c3_2.get("实习项目经历", [])
print(f"  Phase 2: STAR={len(star)}条, 全文={len(c3_2['优化后完整简历文本'])}字, 评分={c3_2['岗位匹配评分']['总分']}")

# ===== Test 4: History =====
print("\n" + "━" * 50)
print("④ 历史记录")
print("━" * 50)
h = get(BASE + "/api/resume?page=1&pageSize=5")
print(f"  共 {h['total']} 条")

# ===== Test 5: RAG =====
print("\n" + "━" * 50)
print("⑤ RAG 知识库")
print("━" * 50)
rag = get(BASE + "/api/rag/upload")
print(f"  向量: {rag['totalRecords']}条, 来源: {rag['totalSources']}个")

# ===== Cleanup =====
import os
os.remove("c:/Users/李芸/resume-optimizer/test-classic.json")
os.remove("c:/Users/李芸/resume-optimizer/test-internet.json")
os.remove("c:/Users/李芸/resume-optimizer/test-demo.py")
print("\n✅ 测试完成，临时文件已清理")
