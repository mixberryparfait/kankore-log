function logWithStyle(message, timeSpan = null, group = false) {
  const baseStyle = 'font-weight: bold; font-size: 12px;';
  const styles = {
    sortie: `color: #4CAF50; ${baseStyle}`,
    battle: `color: #F44336; ${baseStyle}`,
    night: `color: #9C27B0; ${baseStyle}`,
    result: `color: #2196F3; ${baseStyle}`,
    return: `color: #FF9800; ${baseStyle}`,
    time: 'color: #607D8B;'
  };

  let icon = '';
  let style = '';
  
  if (message.includes('出撃開始')) {
    icon = '⚓';
    style = styles.sortie;
  } else if (message.includes('戦闘開始')) {
    icon = '⚔️';
    style = styles.battle;
  } else if (message.includes('夜戦突入')) {
    icon = '🌙';
    style = styles.night;
  } else if (message.includes('戦闘終了')) {
    icon = '🏆';
    style = styles.result;
  } else if (message.includes('母港帰投')) {
    icon = '🏠';
    style = styles.return;
  }

  log_func = group ? console.groupCollapsed : console.log; 
  if (timeSpan) {
    log_func(`%c${icon} ${message}%c (${timeSpan})`, style, styles.time);
  } else {
    log_func(`%c${icon} ${message}`, style);
  }
}

function getTimeString(date) {
  return date.toTimeString().split(' ')[0];
}

function calculateDuration(startTime, endTime) {
  return Math.floor((endTime - startTime) / 1000);
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

///////////////////////////////////////////

let battleData = {
  sortieTime: null,
  returnTime: null,
  battleStartTime: null,
  battleEndTime: null,
  records: []
};

function resetBattleData() {
  battleData = {
    sortieTime: null,
    returnTime: null,
    battleStartTime: null,
    battleEndTime: null,
    records: [...battleData.records]  // 記録は保持
  };
}

chrome.webRequest.onCompleted.addListener(
  function(details) {
    // kcsapiへのリクエストのみ処理
    if (!details.url.includes('kcsapi')) return;

    try {
      const endpoint = details.url.split('kcsapi/')[1];
      // console.log(endpoint)
      if (!endpoint) return;  // endpointが取得できない場合は処理しない
      
      const now = new Date();
      
      switch(endpoint) {
        case 'api_req_map/start': {
          battleData.sortieTime = now;
          // 前回の帰投時刻がある場合のみピット時間を計算
          if (battleData.returnTime) {
            const pitTime = calculateDuration(battleData.returnTime, now);
            logWithStyle(`出撃開始: ${getTimeString(now)}`, `母港操作: ${formatDuration(pitTime)}`, true);
          
            // 記録を保存
            battleData.records.push({
              pitTime: pitTime,
              sortieTime: getTimeString(now),
              returnTime: getTimeString(battleData.returnTime),
              sortieLength: null
            });
          }
          else {
            logWithStyle(`出撃開始: ${getTimeString(now)}`, null, true);
          
            // 記録を保存
            battleData.records.push({
              pitTime: null,
              sortieTime: getTimeString(now),
              returnTime: null,
              sortieLength: null
            });
          }
          // 新しい出撃を開始するので帰投時刻をリセット
          battleData.returnTime = null;
          battleData.battleStartTime = null;
          battleData.battleEndTime = null;
          break;
        }
          
        case 'api_req_sortie/battle':
        case 'api_req_combined_battle/battle':
        case 'api_req_combined_battle/ld_airbattle': {
          battleData.battleStartTime = now;
          logWithStyle(`戦闘開始: ${getTimeString(now)}`);
          break;
        }
          
        case 'api_req_battle_midnight/battle':
        case 'api_req_combined_battle/midnight_battle': {
          logWithStyle(`夜戦突入: ${getTimeString(now)}`);
          break;
        }
          
        case 'api_req_sortie/battleresult':
        case 'api_req_combined_battle/battleresult': {
          battleData.battleEndTime = now;
          
          // 戦闘開始時刻がある場合のみ戦闘時間を表示
          if (battleData.battleStartTime) {
            const battleTime = calculateDuration(battleData.battleStartTime, now);
            logWithStyle(`戦闘終了: ${getTimeString(now)}`, `戦闘時間: ${formatDuration(battleTime)}`);
          } else {
            logWithStyle(`戦闘終了: ${getTimeString(now)}`);
          }
          
          // 戦闘終了したのでbattleStartTimeをリセット
          battleData.battleStartTime = null;
          break;
        }
          
        case 'api_get_member/furniture': {
          // まだ帰投時刻が記録されていない場合のみ処理
          if (!battleData.returnTime) {
            battleData.returnTime = now;
            
            // 出撃時間を計算して表示
            if (battleData.sortieTime) {
              console.groupEnd();
              const sortieLength = calculateDuration(battleData.sortieTime, now);
              logWithStyle(`母港帰投: ${getTimeString(now)}`, `出撃時間: ${formatDuration(sortieLength)}`);
              // 記録を更新
              if (battleData.records.length > 0) {
                battleData.records[battleData.records.length - 1].sortieLength = sortieLength;
              }
            } else {
              logWithStyle(`母港帰投: ${getTimeString(now)}`);
            }
            
            // 帰投したので戦闘関連のデータをリセット
            battleData.battleStartTime = null;
            battleData.battleEndTime = null;
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error in KanColle Logger:', error);
    }
  },
  {
    urls: [
      "http://*/kcsapi/*"
    ]
  }
);
