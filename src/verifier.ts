import { call }         from "./client.ts"
import { JUDGE_SYSTEM } from "./activator.ts"
import { PROBLEMS }     from "./problems.ts"
import type { Trace, ProblemKey, CodeVerifyResult, JudgeScore, EvalResult } from "./types.ts"

// ── Code execution verifiers ─────────────────────────────────────────────────

async function runPython(code: string): Promise<CodeVerifyResult> {
  const proc = Bun.spawn(["python3", "-c", code], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return {
    status: exitCode === 0 ? "passed" : "failed",
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  }
}

const CODE_VERIFIERS: Partial<Record<ProblemKey, () => Promise<CodeVerifyResult>>> = {
  p001: () => runPython(`
import time
def original(a, b): return [x for x in a if x in b]
def fixed(a, b):
    sb = set(b)
    return [x for x in a if x in sb]
a = list(range(10000)); b = list(range(2000, 10000))
t0=time.perf_counter(); ro=original(a,b); t1=time.perf_counter()
t2=time.perf_counter(); rf=fixed(a,b);    t3=time.perf_counter()
assert sorted(ro)==sorted(rf)
orig_ms=(t1-t0)*1000; fix_ms=(t3-t2)*1000
print(f"original={orig_ms:.1f}ms  fixed={fix_ms:.2f}ms  speedup={orig_ms/fix_ms:.0f}x  target_met={fix_ms<10}")
`),

  p002: () => runPython(`
def get_user_permissions(user_role, extra_perms=[]):
    base = {'admin':['read','write','delete'],'editor':['read','write'],'viewer':['read']}
    perms = list(base.get(user_role, ['read']))
    perms.extend(extra_perms)
    return perms
r1=get_user_permissions('viewer')
r2=get_user_permissions('viewer')
r3=get_user_permissions('viewer')
assert r1==r2==r3==['read'], f"Mutation still present: {r1},{r2},{r3}"
r4=get_user_permissions('admin',['audit'])
r5=get_user_permissions('admin')
assert r5==['read','write','delete'], f"Extra perms leaked: {r5}"
print(f"r1={r1} r2={r2} r3={r3}")
print(f"r4={r4} r5={r5}")
print("all assertions passed")
`),

  p003: () => runPython(`
import threading
class Counter:
    def __init__(self): self.value=0; self._lock=threading.Lock()
    def increment(self):
        with self._lock:
            c=self.value; self.value=c+1
results=[]
for _ in range(5):
    ctr=Counter()
    def worker():
        for _ in range(1000): ctr.increment()
    ts=[threading.Thread(target=worker) for _ in range(10)]
    for t in ts: t.start()
    for t in ts: t.join()
    results.append(ctr.value)
assert all(r==10000 for r in results), f"Race still present: {results}"
print(f"results={results}  all_correct=True")
`),

  // ── Phase 2 verifiers ───────────────────────────────────────────────────

  p004: () => runPython(`
def create_validators(rules):
    validators = []
    for field, min_v, max_v in rules:
        def validate(record, field=field, min_v=min_v, max_v=max_v):
            val = record.get(field)
            if val is None:
                return (False, f"missing: {field}")
            if not (min_v <= val <= max_v):
                return (False, f"{field}={val} out of range [{min_v},{max_v}]")
            return (True, "ok")
        validators.append(validate)
    return validators

rules = [("age", 0, 150), ("score", 0, 100), ("temp", -50, 60)]
vs = create_validators(rules)
r = {"age": 25, "score": 85, "temp": 72}
results = [v(r) for v in vs]
assert results[0] == (True, "ok"), f"age=25 should pass: {results[0]}"
assert results[1] == (True, "ok"), f"score=85 should pass: {results[1]}"
assert results[2][0] == False, f"temp=72 should fail: {results[2]}"
r2 = {"age": 200, "score": 50, "temp": 25}
assert vs[0](r2)[0] == False, f"age=200 should fail"
assert vs[1](r2) == (True, "ok"), f"score=50 should pass"
assert vs[2](r2) == (True, "ok"), f"temp=25 should pass"
r3 = {"score": 50, "temp": 25}
assert vs[0](r3)[0] == False, "missing age should fail"
print("all assertions passed")
`),

  p005: () => runPython(`
def read_sensor_data(raw_readings):
    for line in raw_readings:
        parts = line.strip().split(",")
        if len(parts) == 2:
            try:
                yield (float(parts[0]), float(parts[1]))
            except ValueError:
                continue

def analyze_sensors(raw_readings):
    data = list(read_sensor_data(raw_readings))
    total = 0.0
    count = 0
    for ts, val in data:
        total += val
        count += 1
    avg = total / count if count > 0 else 0
    above_avg = []
    for ts, val in data:
        if val > avg:
            above_avg.append((ts, val))
    return {"average": avg, "above_average": above_avg, "count": count}

raw = ["1.0,10.0", "2.0,20.0", "3.0,30.0", "4.0,40.0"]
result = analyze_sensors(raw)
assert result["count"] == 4, f"count wrong: {result['count']}"
assert result["average"] == 25.0, f"avg wrong: {result['average']}"
assert len(result["above_average"]) == 2, f"above_avg count wrong: {len(result['above_average'])}"
assert result["above_average"] == [(3.0, 30.0), (4.0, 40.0)]
raw2 = ["1.0,5.0", "2.0,5.0"]
r2 = analyze_sensors(raw2)
assert r2["above_average"] == [], "equal values: nothing above avg"
print("all assertions passed")
`),

  p006: () => runPython(`
import copy

def normalize_scores(students):
    results = []
    for student in students:
        max_s = student["max_score"]
        scores = [round(s / max_s * 100, 1) for s in student["scores"]]
        avg = sum(scores) / len(scores) if scores else 0
        results.append({"name": student["name"], "scores": scores, "average": round(avg, 1)})
    return results

def rank_students(students):
    normalized = normalize_scores(students)
    normalized.sort(key=lambda s: s["average"], reverse=True)
    for i, s in enumerate(normalized):
        s["rank"] = i + 1
    return normalized

students = [
    {"name": "Alice", "scores": [40, 35, 45], "max_score": 50},
    {"name": "Bob", "scores": [28, 32, 30], "max_score": 40},
    {"name": "Carol", "scores": [55, 60, 58], "max_score": 60},
]
original = copy.deepcopy(students)
result = rank_students(students)
assert result[0]["name"] == "Carol", f"Carol should be #1: {result[0]['name']}"
assert result[1]["name"] == "Alice", f"Alice should be #2: {result[1]['name']}"
assert result[2]["name"] == "Bob", f"Bob should be #3: {result[2]['name']}"
for r in result:
    for s in r["scores"]:
        assert 0 <= s <= 100, f"Score {s} for {r['name']} out of range"
assert students == original, "Original data was mutated"
print("all assertions passed")
`),

  p007: () => runPython(`
import csv
from io import StringIO

def load_inventory(csv_text):
    reader = csv.DictReader(StringIO(csv_text))
    inventory = {}
    for row in reader:
        inventory[int(row["product_id"])] = {
            "name": row["name"],
            "quantity": int(row["quantity"]),
            "price": float(row["price"]),
        }
    return inventory

def check_fulfillment(inventory, orders):
    remaining = {}
    for pid, info in inventory.items():
        remaining[pid] = dict(info)
    results = []
    for order in orders:
        pid = order["product_id"]
        qty = order["quantity"]
        product = remaining.get(pid)
        if product is None:
            results.append({"order_id": order["order_id"], "product_id": pid,
                          "status": "unknown_product", "shortage": qty})
            continue
        if product["quantity"] >= qty:
            product["quantity"] -= qty
            results.append({"order_id": order["order_id"], "product_id": pid,
                          "status": "fulfilled", "shortage": 0})
        else:
            shortage = qty - product["quantity"]
            product["quantity"] = 0
            results.append({"order_id": order["order_id"], "product_id": pid,
                          "status": "insufficient", "shortage": shortage})
    return results

csv_text = "product_id,name,quantity,price\\n101,Widget,50,9.99\\n102,Gadget,30,19.99\\n103,Doohickey,100,4.99"
inventory = load_inventory(csv_text)
orders = [
    {"order_id": 1, "product_id": 101, "quantity": 5},
    {"order_id": 2, "product_id": 102, "quantity": 3},
    {"order_id": 3, "product_id": 999, "quantity": 1},
]
results = check_fulfillment(inventory, orders)
assert results[0]["status"] == "fulfilled", f"Order 1 should be fulfilled: {results[0]}"
assert results[1]["status"] == "fulfilled", f"Order 2 should be fulfilled: {results[1]}"
assert results[2]["status"] == "unknown_product", f"Order 3 should be unknown: {results[2]}"
assert inventory[101]["quantity"] == 50, "Original inventory should not be mutated"
print("all assertions passed")
`),

  p008: () => runPython(`
class EventBus:
    def __init__(self):
        self._handlers = {}
    def on(self, event, handler):
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)
    def emit(self, event, data=None):
        if event in self._handlers:
            for handler in list(self._handlers[event]):
                handler(data)

class OrderProcessor:
    def __init__(self, bus):
        self.bus = bus
        self.orders = []
        self.processed = []
        bus.on("order:new", self.log_order)
        bus.on("order:new", self.validate_order)
        bus.on("order:validated", self.process_order)
        bus.on("order:processed", self.notify_customer)
    def validate_order(self, order):
        if order.get("amount", 0) > 0:
            order["status"] = "validated"
            self.bus.emit("order:validated", order)
    def process_order(self, order):
        order["status"] = "processed"
        self.processed.append(order)
        self.bus.emit("order:processed", order)
    def notify_customer(self, order):
        order["notified"] = True
    def log_order(self, order):
        self.orders.append(dict(order))

bus = EventBus()
proc = OrderProcessor(bus)
bus.emit("order:new", {"id": 1, "amount": 50, "item": "widget"})
bus.emit("order:new", {"id": 2, "amount": 75, "item": "gadget"})
log = proc.orders
assert len(log) == 2, f"Expected 2 log entries, got {len(log)}"
assert "status" not in log[0], f"Log should capture original state: {log[0]}"
assert "notified" not in log[0], f"Log should not have notified: {log[0]}"
assert log[0] == {"id": 1, "amount": 50, "item": "widget"}, f"Wrong log[0]: {log[0]}"
assert log[1] == {"id": 2, "amount": 75, "item": "gadget"}, f"Wrong log[1]: {log[1]}"
assert len(proc.processed) == 2
assert proc.processed[0]["status"] == "processed"
print("all assertions passed")
`),
}

export async function verifyCode(problemKey: ProblemKey): Promise<CodeVerifyResult> {
  const fn = CODE_VERIFIERS[problemKey]
  if (!fn) return { status: "not_implemented" }
  return fn()
}

// ── Judge evaluation ──────────────────────────────────────────────────────────

export async function judgeOutput(
  problemText:  string,
  diagnosis:    string,
  groundTruth:  Record<string, string>,
): Promise<JudgeScore | null> {
  const raw = await call(
    JUDGE_SYSTEM,
    `Problem:\n${problemText}\n\n` +
    `Ground truth:\n${JSON.stringify(groundTruth, null, 2)}\n\n` +
    `Diagnosis:\n${diagnosis}`,
    1000,
  )

  const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim()
  try {
    return JSON.parse(cleaned) as JudgeScore
  } catch {
    console.error("Judge parse error. Raw:", raw.slice(0, 300))
    return null
  }
}

// ── Full evaluation ───────────────────────────────────────────────────────────

export async function evaluate(
  trace:     Trace,
  agentKey:  "generator" | "arbitrator" = "arbitrator",
): Promise<EvalResult> {
  const prob      = PROBLEMS[trace.problemKey]
  const diagnosis = agentKey === "arbitrator"
    ? (trace.arbitratorOutput ?? trace.generatorOutput)
    : trace.generatorOutput

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  VERIFICATION: ${trace.problemKey} / ${agentKey}`)
  console.log("=".repeat(60))

  // Code execution
  console.log("\n[1] Code execution...")
  const codeResult = await verifyCode(trace.problemKey)
  console.log(`    ${codeResult.status.toUpperCase()}`)
  if (codeResult.stdout) console.log(`    ${codeResult.stdout}`)
  if (codeResult.stderr) console.log(`    ERR: ${codeResult.stderr}`)

  // Judge
  console.log("\n[2] Judge evaluation...")
  const score = await judgeOutput(prob.problem, diagnosis, prob.groundTruth)

  if (!score) {
    console.log("    Parse error — see above")
  } else {
    console.log(`    Correctness:       ${score.correctness_score}/10`)
    console.log(`    Reasoning quality: ${score.reasoning_quality_score}/10`)
    console.log(`    Root cause found:  ${score.root_cause_identified}`)
    console.log(`    Correct fix:       ${score.correct_fix_proposed}`)
    console.log(`    Verdict:           ${score.overall_verdict}`)
    console.log(`    Key insight:       ${score.key_insight}`)
    if (score.expert_markers_present.length)
      console.log(`    Expert markers:    ${score.expert_markers_present.join(", ")}`)
    if (score.mediocre_markers_present.length)
      console.log(`    Mediocre markers:  ${score.mediocre_markers_present.join(", ")}`)
  }

  return {
    problemKey: trace.problemKey,
    agent:      agentKey,
    codeVerify: codeResult,
    judgeScore: score,
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args      = process.argv.slice(2)
  const tracePath = args[0]

  if (!tracePath) {
    console.error("Usage: bun src/verifier.ts <trace.json> [--agent gen|arb]")
    process.exit(1)
  }

  const traceFile = await Bun.file(tracePath).text()
  const trace     = JSON.parse(traceFile) as Trace
  const agentArg  = args.includes("--agent")
    ? args[args.indexOf("--agent") + 1]
    : "arbitrator"
  const agent     = agentArg === "gen" ? "generator" : "arbitrator"

  const result = await evaluate(trace, agent)

  if (args.includes("--save")) {
    const outPath = tracePath.replace(".json", "_eval.json")
    await Bun.write(outPath, JSON.stringify(result, null, 2))
    console.log(`\nEval saved → ${outPath}`)
  }
}
