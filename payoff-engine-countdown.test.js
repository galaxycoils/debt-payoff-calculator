// TDD: live remaining time formatter
function formatRemaining(ms) {
  if (ms <= 0) return 'Debt-free now!';
  var s = Math.floor(ms / 1000);
  var days = Math.floor(s / 86400);
  s %= 86400;
  var hours = Math.floor(s / 3600);
  s %= 3600;
  var mins = Math.floor(s / 60);
  var secs = s % 60;
  return days + 'd ' + hours + 'h ' + mins + 'm ' + secs + 's';
}

// Simple assert for Node
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg + ': ' + a + ' != ' + b);
}

// Tests
assertEqual(formatRemaining(0), 'Debt-free now!', 'zero');
assertEqual(formatRemaining(3661000), '0d 1h 1m 1s', 'about 1h1m1s');
console.log('countdown format tests passed');
