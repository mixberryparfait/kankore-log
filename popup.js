document.getElementById('copyButton').addEventListener('click', function() {
  chrome.runtime.sendMessage({action: "getRecords"}, function(records) {
    if (!records || records.length === 0) {
      document.getElementById('message').textContent = "記録がありません";
      return;
    }

    const csv = records.map(record => {
      return `${record.pitTime || ''},${record.sortieTime || ''},${record.returnTime || ''},${record.sortieLength ? formatDuration(record.sortieLength) : ''}`;
    }).join('\n');

    const header = "ピットイン時間（秒）,出撃時刻（HH:MM:SS),帰投時刻（HH:MM:SS),出撃時間(MM:SS)\n";
    
    navigator.clipboard.writeText(header + csv).then(function() {
      document.getElementById('message').textContent = "コピーしました";
    }).catch(function(err) {
      document.getElementById('message').textContent = "コピーに失敗しました";
    });
  });
});

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}