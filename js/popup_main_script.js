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
let video;
let userName;
let userImage;
let intervalId;
let interval3Id;
let interval1Id;
let interval1MinuteId;
let registerButton;
let startMainButton;
let stopButton;
let baseHuman;
let totalTime;
let resultButton;
let averageStudyRate;
let maxStudyRate;
let minStudyRate;
let currentDate;
let startTimeInfo;
let nameInfo;
let dateInfo;
let endTimeInfo;
let ttrwd;
let totalStudyTime;
let baseImg;

//차트
let ctx;
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
function video_on(id) {
  const hasCameraPermission = sessionStorage.getItem("cameraPermission");
  video = document.getElementById(id);
  if (hasCameraPermission) {
    // Permission already granted, reuse the stream
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        window.videoStream = stream;
        sessionStorage.setItem("cameraPermission", true);
      })
      .catch((error) => console.log("Error accessing camera", error));
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

function video_off() {
  if (window.videoStream) {
    const tracks = window.videoStream.getTracks();
    tracks.forEach((track) => track.stop());
    window.videoStream = null;
  }
}
// main 페이지가 로드 됐을 때 비디오 다시 틀기
window.addEventListener("load", function (event) {
  console.log("adfadsfadfadasfad");
  video_on("video_ready");
});
window.addEventListener("message", function (event) {
  console.log("message done");
  // var receivedMessage = event.data; // Get the message object
  // console.log(receivedMessage);
  // // Access the values from the message object
  // userName = receivedMessage.name;
  // console.log(userName);
  // userImage = receivedMessage.image;
  // console.log(userImage);
});

startMainButton = document.getElementById("button-start-main");
stopButton = document.getElementById("button-stop");
totalTime = document.getElementById("totalTime");
startTimeInfo = document.getElementById("startTimeInfo");
nameInfo = document.getElementById("nameInfo");
dateInfo = document.getElementById("dateInfo");
endTimeInfo = document.getElementById("endTimeInfo");
maxStudyRate = document.getElementById("maxStudyRate");
minStudyRate = document.getElementById("minStudyRate");
averageStudyRate = document.getElementById("averageStudyRate");
ttrwd = document.getElementById("totalreward");
totalStudyTime = document.getElementById("totalStudyTime");
baseHuman = new Human(userName, userImage, "none", "none");
ctx = document.getElementById("myChart").getContext("2d");
baseImg = document.getElementById("dynamic-image");
startMainButton.addEventListener("click", startFunction);

baseImg.src = "./python/base_face_img.jpg";

stopButton.addEventListener("click", function () {
  stopFunction();
});

// 스터디 체크를 해봅 시다
// 3초마다 1씩 증가
let check3Num = 1;
// 1초마다 1씩 증가
let check1Num = 1;
// 3초마다 정상인 경우 1씩 증가, 1분마다 초기화
let normal = 1;
// 3초마다 공부중인 경우 1씩 증가
let totalStudyTimeNum = 0;

// 15초마다 정상인 경우 1씩 증가
let total_normal = 0;
// 15초마다 비정상인 경우 1씩 증가
let total_fail = 0;
var success_interval_num = 0;

let maxRate = 0;
let minRate = 100;
let currentRate = 0;
let rateList = Array(10).fill(0);
let currentMinute = 0;

//
let totalReward = 0;
// 여기가 전체 history 저장
// 형식: [구간 시작시간, 구간 끝시간, 구간의 상태 (normal / absence / other_person)]
let total_result = [];

let today = new Date();

// State variable
let start_time = Date.now();
let sameHuman = true;

var stopped_time = 0;
let start_stop_time = Date.now();
let end_stop_time = Date.now();

// 여기부터 차트 컨트롤 하는 부분 ...

let chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: Array.from({ length: rateList.length }, (_, i) => `${i + 1} Min`), // Changed labels to only show the end of each period
    datasets: [
      {
        label: undefined, // Set label to undefined to hide it
        data: rateList,
        backgroundColor: "purple",
        barThickness: 10,
      },
    ],
  },
  options: {
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          stepSize: 0.2,
          callback: function (value) {
            return (value * 100).toFixed(0) + "%";
          },
        },
      },
    },
    plugins: {
      annotation: {
        annotations: [
          {
            type: "line",
            yMin: 0.6,
            yMax: 0.6,
            borderColor: "red",
            borderWidth: 2,
          },
        ],
      },
    },
    plugins: {
      legend: {
        labels: {
          generateLabels: function () {
            return [];
          },
        },
      },
    },
  },
});

// chart가 업데이트 될 떄 보상도 증가
function chartUpdate(changedData) {
  ttrwd.innerHTML =
    `<h3 class="text-pop-large", id="totalReward">` + totalReward + `</h3>`;
  chart.data.datesets = changedData;
  chart.update();
}
// 여기까지 차트 컨트롤 ..

function time_set(part, partname, hour, minute, second) {
  if (parseInt(hour) < 10) {
    hour = "0" + hour;
  }
  if (parseInt(minute) < 10) {
    minute = "0" + minute;
  }
  if (parseInt(second) < 10) {
    second = "0" + second;
  }
  part.innerHTML =
    `<h1 class="text-pop-large", id="` +
    partname +
    `">` +
    hour +
    `:` +
    minute +
    `:` +
    second +
    `</h1>`;
}

function time_set_small(part, partname, hour, minute, second) {
  if (parseInt(hour) < 10) {
    hour = "0" + hour;
  }
  if (parseInt(minute) < 10) {
    minute = "0" + minute;
  }
  if (parseInt(second) < 10) {
    second = "0" + second;
  }
  part.innerHTML =
    `<h1 class="text-pop-small", id="` +
    partname +
    `">` +
    hour +
    `:` +
    minute +
    `:` +
    second +
    `</h1>`;
}

// 모든 것이 끝날 때 실행행
function stopFunction() {
  clearInterval(intervalId);
  clearInterval(interval3Id);
  clearInterval(interval1Id);
  clearInterval(interval1MinuteId);
  video_off();
  // history show 하는 함수
  changeInfoEnd();
  changeRate_and_Reward_End();
  changeTimeEnd();

  startMainButton.style.display = "none";
  stopButton.style.display = "none";
}

// 1초에 한번씩 실행되야 하는 것
function startFunction() {
  currentDate = new Date();
  start_time = Date.now();
  changeInfoStart();
  timerChange();
  studyFunction();
  update1MinuteFunction();
  intervalId = setInterval(function () {
    capture_compareHuman("http://localhost:5000/api/compare-human", baseHuman)
      .then((result) => {
        const compare_result = result.result;

        if (compare_result === "정상") {
          sameHuman = true;
        } else {
          sameHuman = false;
        }
        console.log("동일인 : " + compare_result);
        check1Num++;
      })
      .catch((error) => {
        console.error(error);
      });
  }, 15000);
  if (video.paused) {
    video.play();
  }
}

function timerChange() {
  interval1Id = setInterval(function () {
    var cur_time = Date.now();
    let timer = time_processing(Math.floor((cur_time - start_time) / 1000));
    // 여기서 Total Time을 바꿔줍니다.
    time_set(totalTime, "totalTime", timer[0], timer[1], timer[2]);
  }, 1000);
}

function studyFunction() {
  interval3Id = setInterval(function () {
    capture_studyHuman("http://localhost:5000/api/study-human").then(
      (result) => {
        const compare_result = result.result;
        check3Num++;
        console.log("공부중 : " + compare_result);
        // 같은 사람이면서 공부 하고 있음
        if (compare_result == "concentrating" && sameHuman) {
          normal++;
          totalStudyTimeNum++;
        }
      }
    );
  }, 15000);
}

function update1MinuteFunction() {
  interval1MinuteId = setInterval(function () {
    // 1분마다 보상 증정, 이 시간대의 공부 %가 50% 이상이라면 보상 증정
    // 1분마다 currentMinute을 증가시킴.
    if (normal >= 2) {
      totalReward += (normal - 1) * 100;
      total_normal++;
    } else {
      total_fail++;
    }
    currentRate = normal * 0.25;
    console.log("normal : " + normal);
    console.log("totalReward : " + totalReward);
    console.log("curent Rate : " + currentRate);
    console.log("currentMinute : " + currentMinute);

    if (currentRate > 1) {
      currentRate = 1;
    }

    // rateList.push((currentRate / 100, currentMinute));
    rateList[currentMinute] = currentRate;
    chartUpdate(rateList);
    currentMinute += 1;
    // maxRate 설정
    if (maxRate < currentRate) {
      maxRate = currentRate;
    }
    if (minRate > currentRate) {
      minRate = currentRate;
    }
    normal = 0;

    // 10분이 지나면, 측정 종료
    if (currentMinute == 10) {
      stopFunction();
    }
  }, 60100);
}

function changeInfoStart() {
  let currentDate = new Date();
  dateInfo.innerHTML =
    `<h1 class="text-pop-small", id="dateInfo">` +
    currentDate.getFullYear() +
    `:` +
    (currentDate.getMonth() + 1) +
    `:` +
    currentDate.getDate() +
    `</h1>`;

  nameInfo.innerHTML =
    `<h1 class="text-pop-small", id="nameInfo">` + "유저" + `</h1>`;

  time_set_small(
    startTimeInfo,
    "startTimeInfo",
    currentDate.getHours(),
    currentDate.getMinutes(),
    currentDate.getSeconds()
  );
}

function changeInfoEnd() {
  let currentDate = new Date();
  time_set_small(
    endTimeInfo,
    "endTimeInfo",
    currentDate.getHours(),
    currentDate.getMinutes(),
    currentDate.getSeconds()
  );
}

function changeTimeEnd() {
  let cur_time = Date.now();
  let endTimer = time_processing(
    Math.floor((averageRate * (cur_time - start_time)) / 1000)
  );
  // 여기서 Total Time을 바꿔줍니다.
  time_set(
    totalStudyTime,
    "totalStudyTime",
    endTimer[0],
    endTimer[1],
    endTimer[2]
  );
}

function changeRate_and_Reward_End() {
  ttrwd.innerHTML =
    `<h3 class="text-pop-large", id="totalReward">` + totalReward + `</h3>`;
  let sumRate = 0;
  let num = 0;
  for (var i = 0; i < rateList.length; i++) {
    if (rateList[i] > 0) {
      num++;
      sumRate += rateList[i];
    }
  }
  averageRate = sumRate / num;

  if (maxRate > 1) {
    maxRate = 1;
  }
  maxStudyRate.innerHTML =
    `<h3 class="text-pop-large", id="maxStudyRate">` +
    maxRate * 100 +
    `%` +
    `</h3>`;
  minStudyRate.innerHTML =
    `<h3 class="text-pop-large", id="minStudyRate">` +
    minRate * 100 +
    `%` +
    `</h3>`;
  averageStudyRate.innerHTML =
    `<h3 class="text-pop-large", id="averageStudyRate">` +
    Math.floor(averageRate * 100) +
    `%` +
    `</h3>`;
}

function time_processing(second) {
  let res_hour = Math.floor(second / 3600);
  let res_minute = Math.floor((second - 3600 * res_hour) / 60);
  let res_second = second - 3600 * res_hour - 60 * res_minute;
  return [res_hour, res_minute, res_second];
}

// function history_show() {
//   // history show 하는 함수

//   let total_history = [];
//   for (var i = 0; i < total_result.length; i++) {
//     var interval_start = time_processing(total_result[i][0]);
//     var interval_end = time_processing(total_result[i][1]);
//     var string1 = `${interval_start[0]}:${interval_start[1]}:${interval_start[2]} ~
//           ${interval_end[0]}:${interval_end[1]}:${interval_end[2]}`;
//     if (total_result[i][2] == "normal") {
//       string1 = string1 + `<h1 class = "text-pop-small-success" >SUCCESS</h1>`;
//     } else if (total_result[i][2] == "absence") {
//       string1 =
//         string1 + `<h1 class = "text-pop-small-fail" >FAIL - 자리 비움</h1>`;
//     } else {
//       string1 =
//         string1 + `<h1 class = "text-pop-small-fail" >FAIL - 다른 사람</h1>`;
//     }
//     total_history.push(string1);
//   }

//   let card_container = document.getElementById("card-container");
//   let innerString = `<div class="card-body", id = "card-container">`;
//   for (var i = 0; i < total_history.length; i++) {
//     innerString += total_history[i];
//   }
//   innerString += `</div>`;
//   card_container.innerHTML = innerString;
// }

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

    const dataUrl = canvas.toDataURL("image1/jpeg");

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

// 2.4초 동안 16장의 사진을 찍어서 datURL형태의 이미지 리스트를 생성
// 해당 이미지 리스트를 python URL에 보내서 결과를 받음
function capture_studyHuman(python_url) {
  return new Promise((resolve, reject) => {
    const photoList = []; // Array to store captured photos
    let captureCount = 0; // Counter for capturing photos
    const captureIntervalId = setInterval(function () {
      if (captureCount < 16) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas
          .getContext("2d")

          .drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("studyImage" + captureCount + "/jpeg");
        // Increment the capture count
        captureCount++;
        photoList.push(dataUrl);
      } else {
        // Stop capturing photos after 16 captures
        clearInterval(captureIntervalId);
        console.log(photoList.length);
        fetch(python_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imgList: photoList }),
        })
          .then((response) => response.json())
          .then((result) => {
            const ret = {
              result: result.result,
            };
            resolve(ret);
          })
          .catch((error) => {
            reject("fuck you" + error);
          });
      }
    }, 150);
  });
}
