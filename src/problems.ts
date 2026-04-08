import type { Problem, ProblemKey } from "./types.ts"

export const PROBLEMS: Record<ProblemKey, Problem> = {
  p001: {
    label:      "Quadratic search (find_common_users)",
    type:       "optimization",
    difficulty: "medium",
    problem: `\
This Python function is called millions of times per day and has become
a critical performance bottleneck. It takes ~800ms for n=10,000 but
should complete in under 10ms. Profile shows 95% of time in this function.

\`\`\`python
def find_common_users(list_a: list, list_b: list) -> list:
    common = []
    for user in list_a:
        if user in list_b:
            common.append(user)
    return common
\`\`\`

Input sizes: list_a ~10,000 items, list_b ~8,000 items, unique integers.
Diagnose and fix.`,
    groundTruth: {
      root_cause:        "O(n*m) complexity — linear search in list_b per element of list_a",
      correct_fix:       "Convert list_b to set for O(1) lookup → O(n+m) overall",
      complexity_before: "O(n*m)",
      complexity_after:  "O(n+m)",
      expected_speedup:  "~350x for these input sizes",
    },
  },

  p002: {
    label:      "Mutable default argument (get_user_permissions)",
    type:       "bug",
    difficulty: "medium",
    problem: `\
This function works correctly the first time it's called but returns
wrong results on subsequent calls. No errors are raised.

\`\`\`python
def get_user_permissions(user_role: str, extra_perms: list = []) -> list:
    base_permissions = {
        'admin':  ['read', 'write', 'delete'],
        'editor': ['read', 'write'],
        'viewer': ['read']
    }
    perms = base_permissions.get(user_role, ['read'])
    perms.extend(extra_perms)
    return perms
\`\`\`

get_user_permissions('viewer') → ['read'] first call, ['read','read']
second call, grows unboundedly. Diagnose and fix.`,
    groundTruth: {
      root_cause:    "base_permissions dict values are mutable lists; .extend() mutates them in-place; the dict is shared across all calls",
      correct_fix:   "perms = list(base_permissions.get(...)) — copy before extending",
      failure_class: "state_mutation_bug",
    },
  },

  p003: {
    label:      "Race condition (Counter under load)",
    type:       "bug",
    difficulty: "hard",
    problem: `\
A counter service fails under load. 10 threads × 1000 increments should
reach exactly 10000 but typically reaches 3000-7000. Does not reproduce
in single-threaded tests.

\`\`\`python
import threading

class Counter:
    def __init__(self):
        self.value = 0

    def increment(self):
        current = self.value
        self.value = current + 1  # non-atomic

counter = Counter()

def worker():
    for _ in range(1000):
        counter.increment()

threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads: t.start()
for t in threads: t.join()

print(counter.value)  # Should be 10000, typically 3000-7000
\`\`\`

Diagnose and fix.`,
    groundTruth: {
      root_cause:    "Read-modify-write of self.value is not atomic; threads interleave between read and write, losing increments",
      correct_fix:   "threading.Lock() around the read-modify-write operation",
      failure_class: "concurrency_race_condition",
    },
  },

  // ── Phase 2: harder problems ──────────────────────────────────────────────

  p004: {
    label:      "Closure late binding (create_validators)",
    type:       "bug",
    difficulty: "medium",
    problem: `\
These validator functions should each check a different field, but they all
validate the same field. Three validators are created for "age", "score", and
"temp", but all three return identical results for any record.

\`\`\`python
def create_validators(rules):
    """Create validator functions from rules.
    Each rule: (field_name, min_val, max_val).
    Returns list of validator(record) -> (bool, message) functions."""
    validators = []
    for field, min_v, max_v in rules:
        def validate(record):
            val = record.get(field)
            if val is None:
                return (False, f"missing: {field}")
            if not (min_v <= val <= max_v):
                return (False, f"{field}={val} out of range [{min_v},{max_v}]")
            return (True, "ok")
        validators.append(validate)
    return validators

rules = [("age", 0, 150), ("score", 0, 100), ("temp", -50, 60)]
validators = create_validators(rules)
record = {"age": 25, "score": 85, "temp": 72}

for i, v in enumerate(validators):
    print(f"Validator {i}: {v(record)}")
\`\`\`

Expected: Validator 0 (age) passes, Validator 1 (score) passes, Validator 2 (temp) fails (72 > 60).
Actual: All three validators return the same result, all checking "temp" range.
Diagnose and fix.`,
    groundTruth: {
      root_cause:    "Python closures capture variables by reference, not value. All three closures share the same loop variables (field, min_v, max_v). After the loop completes, these hold the last iteration's values ('temp', -50, 60). All validators check the same field.",
      correct_fix:   "Use default arguments to capture current values: def validate(record, field=field, min_v=min_v, max_v=max_v):",
      failure_class: "closure_late_binding",
    },
  },

  p005: {
    label:      "Generator exhaustion (analyze_sensors)",
    type:       "bug",
    difficulty: "medium",
    problem: `\
This sensor analysis function computes the correct average but always returns
an empty list for above-average readings. The second loop never finds matches.

\`\`\`python
def read_sensor_data(raw_readings):
    """Parse raw sensor readings, yielding (timestamp, value) pairs."""
    for line in raw_readings:
        parts = line.strip().split(",")
        if len(parts) == 2:
            try:
                yield (float(parts[0]), float(parts[1]))
            except ValueError:
                continue

def analyze_sensors(raw_readings):
    """Return average and list of above-average readings."""
    data = read_sensor_data(raw_readings)

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
print(result)
\`\`\`

Expected: average=25.0, above_average=[(3.0, 30.0), (4.0, 40.0)], count=4.
Actual: average=25.0, above_average=[], count=4.
The average computes correctly but above_average is always empty. Diagnose and fix.`,
    groundTruth: {
      root_cause:    "read_sensor_data is a generator (uses yield). Generators are single-use iterators. The first for-loop exhausts the generator completely. The second for-loop iterates an already-exhausted generator, which immediately stops and produces no items.",
      correct_fix:   "Materialize the generator into a list: data = list(read_sensor_data(raw_readings))",
      failure_class: "generator_exhaustion",
    },
  },

  p006: {
    label:      "Mutation + double normalization (rank_students)",
    type:       "bug",
    difficulty: "hard",
    problem: `\
This student ranking system produces wildly wrong normalized scores (160%,
320%) even though normalizing once gives correct percentages. The developer
added a "verification" second call to normalize_scores but scores are now
impossible values.

\`\`\`python
def normalize_scores(students):
    """Normalize raw scores to percentages based on max possible score.
    students: list of {"name": str, "scores": [int], "max_score": int}"""
    results = []
    for student in students:
        max_s = student["max_score"]
        scores = student["scores"]
        for i in range(len(scores)):
            scores[i] = round(scores[i] / max_s * 100, 1)
        avg = sum(scores) / len(scores) if scores else 0
        results.append({"name": student["name"], "scores": scores, "average": round(avg, 1)})
    return results

def rank_students(students):
    """Normalize scores then rank students by average."""
    normalized = normalize_scores(students)
    # Verify normalization
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
result = rank_students(students)
for s in result:
    print(f"#{s['rank']} {s['name']}: avg={s['average']} scores={s['scores']}")
\`\`\`

Expected: Carol (~96.1%), Alice (~80.0%), Bob (~75.0%).
Actual: Scores are 160-320% and rankings are wrong. Diagnose and fix.`,
    groundTruth: {
      root_cause:    "Two interacting bugs. (1) normalize_scores mutates the original scores lists in-place (scores[i] = ...) instead of creating new lists. (2) rank_students calls normalize_scores twice on the same data. The first call converts raw scores to correct percentages. The second call re-normalizes the already-normalized values (e.g. 80.0/50*100 = 160.0). Both bugs must be fixed.",
      correct_fix:   "(1) Use a list comprehension instead of in-place mutation: normalized = [round(s / max_s * 100, 1) for s in student['scores']]. (2) Remove the duplicate normalize_scores call.",
      failure_class: "mutation_plus_redundant_call",
    },
  },

  p007: {
    label:      "Type mismatch in data pipeline (check_fulfillment)",
    type:       "bug",
    difficulty: "hard",
    problem: `\
An inventory fulfillment system reports every product as "unknown_product"
even though the products exist in the CSV inventory. The system worked with
hardcoded test data but fails when loading from CSV.

\`\`\`python
import csv
from io import StringIO

def load_inventory(csv_text):
    """Load inventory from CSV into lookup dict keyed by product_id."""
    reader = csv.DictReader(StringIO(csv_text))
    inventory = {}
    for row in reader:
        inventory[row["product_id"]] = {
            "name": row["name"],
            "quantity": int(row["quantity"]),
            "price": float(row["price"]),
        }
    return inventory

def check_fulfillment(inventory, orders):
    """Check which orders can be fulfilled from inventory."""
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

inventory_csv = """product_id,name,quantity,price
101,Widget,50,9.99
102,Gadget,30,19.99
103,Doohickey,100,4.99"""

inventory = load_inventory(inventory_csv)
orders = [
    {"order_id": 1, "product_id": 101, "quantity": 5},
    {"order_id": 2, "product_id": 102, "quantity": 3},
    {"order_id": 3, "product_id": 999, "quantity": 1},
]
results = check_fulfillment(inventory, orders)
for r in results:
    print(r)
\`\`\`

Expected: Orders 1 and 2 fulfilled, order 3 unknown_product.
Actual: ALL orders show "unknown_product". Diagnose and fix.`,
    groundTruth: {
      root_cause:    "Type mismatch between dict keys. csv.DictReader returns all values as strings, so inventory keys are strings ('101', '102'). But order product_ids are integers (101, 102). dict.get() with an int key against string keys always returns None. The code converts quantity and price to numeric types but leaves product_id as a string.",
      correct_fix:   "Convert product_id to int in load_inventory: inventory[int(row['product_id'])] = ...",
      failure_class: "type_mismatch_silent_failure",
    },
  },

  p008: {
    label:      "Re-entrant event dispatch ordering (OrderProcessor)",
    type:       "bug",
    difficulty: "hard",
    problem: `\
An event-driven order processor logs orders with wrong state. The audit log
should capture each order as received, but instead captures the fully-processed
state (with status="processed" and notified=True). Processing itself works
correctly. Orders are validated, processed, and customers notified. Only the
log is wrong.

\`\`\`python
class EventBus:
    def __init__(self):
        self._handlers = {}

    def on(self, event, handler):
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)

    def emit(self, event, data=None):
        if event in self._handlers:
            for handler in self._handlers[event]:
                handler(data)

class OrderProcessor:
    def __init__(self, bus):
        self.bus = bus
        self.orders = []
        self.processed = []

        bus.on("order:new", self.validate_order)
        bus.on("order:validated", self.process_order)
        bus.on("order:processed", self.notify_customer)
        bus.on("order:new", self.log_order)

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

for entry in proc.orders:
    print(f"Log: {entry}")
for entry in proc.processed:
    print(f"Processed: {entry}")
\`\`\`

Expected log: [{"id": 1, "amount": 50, "item": "widget"}, ...]
Actual log: [{"id": 1, "amount": 50, "item": "widget", "status": "processed", "notified": True}, ...]
Diagnose and fix.`,
    groundTruth: {
      root_cause:    "Handler registration order combined with synchronous event dispatch and shared mutable state. log_order is registered AFTER validate_order for 'order:new'. When emit('order:new') fires, validate_order runs first. It synchronously emits 'order:validated', which triggers process_order, which emits 'order:processed', which triggers notify_customer. The entire validate->process->notify chain completes (mutating the order dict) before log_order gets its turn. By the time log_order snapshots with dict(order), the order already has status='processed' and notified=True.",
      correct_fix:   "Register log_order BEFORE validate_order so it captures the original state: bus.on('order:new', self.log_order) must come before bus.on('order:new', self.validate_order)",
      failure_class: "reentrant_event_dispatch_ordering",
    },
  },
}
