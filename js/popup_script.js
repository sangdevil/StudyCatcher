/*!
* Start Bootstrap - Creative v7.0.6 (https://startbootstrap.com/theme/creative)
* Copyright 2013-2022 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-creative/blob/master/LICENSE)
eslint-env es6
*/

//
// Scripts
//
// Check if permission has already been granted

function video_on(id) {
  const hasCameraPermission = sessionStorage.getItem("cameraPermission");
  video = document.getElementById(id);
  if (hasCameraPermission) {
    // Permission already granted, reuse the stream
    video.srcObject = window.videoStream;
  } else {
    // Request permission and store the flag in sessionStorage
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        window.videoStream = stream;
        sessionStorage.setItem("cameraPermission", true);
      })
      .catch((error) => console.log("Error accessing camera", error));
  }
}

// main 페이지가 로드 됐을 때 비디오 다시 틀기
window.addEventListener("load", function () {
  video_on("video_ready");
});

let video;
let readySection;
let mainSection;
let registerButton;
let startReadyButton;
let startMainButton;
let pauseButton;
let stopButton;
let input_name;
let input_subject;
let input_hour;
let input_minute;
let current_state;
let textBox;
let baseHuman;
let current_time;
let circle;
let circle_text;
let resultButton;
let mainFirstRow;
let mainSecondRow;
let concentration;
let notes;
readySection = document.getElementById("pop-ready");
mainSection = document.getElementById("pop-main");
registerButton = document.getElementById("button-register");
startReadyButton = document.getElementById("button-start-ready");
startMainButton = document.getElementById("button-start-main");
pauseButton = document.getElementById("button-pause");
stopButton = document.getElementById("button-stop");
input_name = document.getElementById("input_name");
input_subject = document.getElementById("input_subject");
input_hour = document.getElementById("input_hour");
input_minute = document.getElementById("input_minute");
current_state = document.getElementById("current_state");
textBox = document.getElementById("data-container");
current_time = document.getElementById("current_time");
video = document.getElementById("video_ready");
circle = document.getElementById("circle");
circle_text = document.getElementById("circle-text");
resultButton = document.getElementById("button-next");
mainFirstRow = document.getElementById("main-first-row");
mainSecondRow = document.getElementById("main-second-row");
concentration = document.getElementById("concentration");
notes = document.getElementById("notes");
startReadyButton.disabled = true;
mainSecondRow.style.display = "none";
readySection.style.display = "block";
mainSection.style.display = "none";
resultButton.style.display = "none";

// 현재 얼굴이 등록 되었다면, 시작 가능합니다.
startReadyButton.addEventListener("click", function () {
  mainSection.style.display = "block";
  readySection.style.display = "none";
  video_on("video_main");
});

registerButton.addEventListener("click", function () {
  //todo!, execute_createHuman() every 2 seconds, and if execute_createHuman(), change the textBox's text, using change_text(text)
  registerButton.disabled = true;
  let id = setInterval(function () {
    // Call capture_createHuman() function and change text
    capture_createHuman("http://localhost:5000/create-human")
      .then((result) => {
        if (result.result === "정상입니다.") {
          video.pause();
          const confirmed = confirm("현재 얼굴을 등록하시겠습니까?");
          if (confirmed) {
            // 만약 얼굴 등록을 원한다면 휴먼 오브젝트 생성
            baseHuman = new Human(
              input_name.value,
              result.img,
              input_subject.value,
              "None"
            );
            console.log("휴먼 등록합니다.");

            startReadyButton.disabled = false;
          } else {
            // 원하지 않는다면, 다시 함수 재생
            registerButton.disabled = false;
            video.play();
          }
        } else {
          alert(result.result);
          registerButton.disabled = false;
        }

        clearInterval(id);
      })
      .catch((error) => {
        console.error(error);
      });
  }, 2000);
});

// 스터디 체크를 해봅 시다
let check_num = 1;
let normal = 0;
let total_normal = 0;
let other_person = 0;
let total_fail = 0;
let absence = 0;
var success_interval_num = 0;

// 여기가 전체 history 저장
// 형식: [구간 시작시간, 구간 끝시간, 구간의 상태 (normal / absence / other_person)]
let total_result = [];

let today = new Date();

class Human {
  constructor(name, img, subject, pose) {
    // human name will be string name.
    // human img will be base-64 encoded string, not the directory.
    // human pose will be string pose.
    this.name = name;
    this.img = img;
    this.subject = subject;
    this.pose = pose;
    this.result_list = [];
  }
}

// State constants
const STATE_CHECKING = "checking";
const STATE_PAUSED = "paused";
const STATE_STOPPED = "stopped";

// State variable
let start_time = Date.now();
let currentState = STATE_STOPPED;
let intervalId;
var stopped_time = 0;
let start_stop_time = Date.now();
let end_stop_time = Date.now();

function time_set(hour, minute, second) {
  if (parseInt(hour) < 10) {
    hour = "0" + hour;
  }
  if (parseInt(minute) < 10) {
    minute = "0" + minute;
  }
  if (parseInt(second) < 10) {
    second = "0" + second;
  }

  current_time.innerHTML =
    `<h1 class = "text-pop-time" id = "current_time">` +
    hour +
    `:` +
    minute +
    `:` +
    second +
    `</h1>`;
}

startMainButton.addEventListener("click", startFunction);

stopButton.addEventListener("click", function () {
  if (currentState == STATE_CHECKING || currentState == STATE_PAUSED) {
    // Stop checking state
    currentState = STATE_STOPPED;
    // Clear interval so check() function stops being called
    clearInterval(intervalId);
    // history show 하는 함수
    history_show();
    startMainButton.style.display = "none";
    stopButton.style.display = "none";
    pauseButton.style.display = "none";
    resultButton.style.display = "block";
  }
});

resultButton.addEventListener("click", result_show);
function startFunction() {
  if (currentState == STATE_STOPPED || currentState == STATE_PAUSED) {
    if (currentState != STATE_PAUSED) {
      start_time = Date.now();
    }
    if (currentState == STATE_PAUSED) {
      let end_stop_time = Date.now();
      stopped_time = (stopped_time + end_stop_time - start_stop_time) / 10;
    }
    // Start checking state
    currentState = STATE_CHECKING;
    // Invoke check() function every 2 seconds
    intervalId = setInterval(function () {
      capture_compareHuman("http://localhost:5000/compare-human", baseHuman)
        .then((result) => {
          const compare_result = result.result;
          var cur_time = Date.now();
          let timer = time_processing(
            Math.floor((cur_time - start_time - stopped_time) / 1000)
          );

          //여기부터 history 출력을 위한 부분
          let history = [];
          for (var i = 0; i < total_result.length; i++) {
            var interval_start = time_processing(total_result[i][0]);
            var interval_end = time_processing(total_result[i][1]);
            var string1 = `${interval_start[0]}:${interval_start[1]}:${interval_start[2]} ~ 
              ${interval_end[0]}:${interval_end[1]}:${interval_end[2]}   `;
            if (total_result[i][2] == "normal") {
              string1 = string1 + "SUCCESS";
            } else {
              string1 = string1 + "FAIL";
            }
            history.push(string1);
          }
          //여기까지
          time_set(timer[0], timer[1], timer[2]);
          if (compare_result === "정상") {
            normal++;
            total_normal++;
          } else if (compare_result === "다른 사람") {
            other_person++;
            total_fail++;
          } else {
            absence++;
            total_fail++;
          }
          circle_text.innerHTML =
            `<span class="circle-text" id = "circle-text">` +
            compare_result +
            `</span>`;
          check_num++;
          // history에 저장 todo! 현재 10초당 한 번
          if (check_num % 10 == 0) {
            if (normal > 4) {
              total_result.push([check_num - 10, check_num, "normal"]);
              success_interval_num++;
            } else {
              if (other_person <= absence) {
                total_result.push([check_num - 10, check_num, "absence"]);
              } else {
                total_result.push([check_num - 10, check_num, "other_person"]);
              }
            }
            normal = 0;
            absence = 0;
            other_person = 0;
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }, 1000);
    if (video.paused) {
      video.play();
    }
  }
}

// check() function ok는 success 인지 아닌지
function change_text(ok, text) {
  // Get data from web-cam and deal with it
  // Update data container element

  if (ok) {
    textBox.innerHTML =
      `<div class="text-box">
<success>정상</success><br><br><ment>` +
      text +
      `</ment></div>`;
  } else {
    textBox.innerHTML =
      `<div class="text-box">
<fail>실패</fail><br><br><ment>` +
      text +
      `</ment></div>`;
  }
}
function time_processing(second) {
  let res_hour = Math.floor(second / 3600);
  let res_minute = Math.floor((second - 3600 * res_hour) / 60);
  let res_second = second - 3600 * res_hour - 60 * res_minute;
  return [res_hour, res_minute, res_second];
}

function history_show() {
  // history show 하는 함수

  let total_history = [];
  for (var i = 0; i < total_result.length; i++) {
    var interval_start = time_processing(total_result[i][0]);
    var interval_end = time_processing(total_result[i][1]);
    var string1 = `${interval_start[0]}:${interval_start[1]}:${interval_start[2]} ~ 
      ${interval_end[0]}:${interval_end[1]}:${interval_end[2]}`;
    if (total_result[i][2] == "normal") {
      string1 = string1 + `<h1 class = "text-pop-small-success" >SUCCESS</h1>`;
    } else if (total_result[i][2] == "absence") {
      string1 =
        string1 + `<h1 class = "text-pop-small-fail" >FAIL - 자리 비움</h1>`;
    } else {
      string1 =
        string1 + `<h1 class = "text-pop-small-fail" >FAIL - 다른 사람</h1>`;
    }
    total_history.push(string1);
  }

  let card_container = document.getElementById("card-container");
  let innerString = `<div class="card-body", id = "card-container">`;
  for (var i = 0; i < total_history.length; i++) {
    innerString += total_history[i];
  }
  innerString += `</div>`;
  card_container.innerHTML = innerString;
}

function result_show() {
  mainFirstRow.style.display = "none";
  mainSecondRow.style.display = "block";
  circle.style.display = "none";

  // 학습 집중도
  let concentration_ratio = (total_normal / check_num) * 100;
  // 보상 포인트 구간 하나 당 1 note
  let bosang = success_interval_num;
  // 보상 포인트는 나중에 알아서 설정
  // history 설정 현재는 어느 구간에서 체크 했는지 안 써있음

  concentration.innerHTML =
    `<h1 class = "text-pop-time" id = "concentration">` +
    concentration_ratio.toFixed(1) +
    `%` +
    `</h1>`;

  notes.innerHTML =
    `<h1 class = "text-pop-time" id = "concentration">` +
    bosang +
    ` NOTE` +
    `</h1>`;
}

// 여기서 result는 "얼굴 미감지", "정상입니다." , "얼굴 여러개 감지" 셋 중 하나
function capture_createHuman(python_url) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg");

    fetch(python_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: dataUrl }),
    })
      .then((response) => response.json())
      .then((result) => {
        const ret = {
          result: result.result,
          img: dataUrl,
        };
        resolve(ret);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

// 여기서 result는 "얼굴 미감지", "정상", "다른 사람"
// 현재 비디오에 담긴 사진을 찍어서 인풋으로 들어온 human2와 비교
function capture_compareHuman(python_url, human2) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg");

    fetch(python_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ img1: dataUrl, img2: human2.img }),
    })
      .then((response) => response.json())
      .then((result) => {
        const ret = {
          result: result.result,
          img1: dataUrl,
          img2: human2.img,
        };
        resolve(ret);
      })
      .catch((error) => {
        reject("fuck you" + error);
      });
  });
}
