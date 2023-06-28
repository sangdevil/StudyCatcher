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
  
  // main 페이지가 로드 됐을 때 비디오 다시 틀기
  window.addEventListener("load", function () {
    console.log("adfadsfadfadasfad");
    video_on("video_ready");
  });
  
  let video;
  let userName;
  let userImage;
  let intervalId;
  let interval3Id;
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
  
  window.addEventListener("message", function (event) {
    var receivedMessage = event.data; // Get the message object
  
    // Access the values from the message object
    userName = receivedMessage.name;
    console.log(userName);
    userImage = receivedMessage.image;
    console.log(userImage)
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
  reward = document.getElementById("reward");
  ttrwd = document.getElementById("totalreward")
  
  baseHuman = new Human(userName, userImage, "none", "none");
  startMainButton.addEventListener("click", startFunction);
  
  stopButton.addEventListener("click", function () {
    clearInterval(intervalId);
    clearInterval(interval3Id);
    // history show 하는 함수
    changeInfoEnd();
    changeTimeEnd();
    changeRate_and_Reward_End();
    startMainButton.style.display = "none";
    stopButton.style.display = "none";
  });
  
  // 스터디 체크를 해봅 시다
  // 3초마다 1씩 증가
  let check3Num = 1;
  // 1초마다 1씩 증가
  let check1Num = 1;
  // 3초마다 정상인 경우 1씩 증가, 15초마다 초기화
  let normal = 0;
  
  // 15초마다 정상인 경우 1씩 증가
  let total_normal = 0;
  // 15초마다 비정상인 경우 1씩 증가
  let total_fail = 0;
  var success_interval_num = 0;
  
  let maxRate = 0;
  let minRate = 100;
  
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
    totalTime.innerHTML =
      `<h1 class="text-pop-large", id="totalTime">` +
      hour +
      `:` +
      minute +
      `:` +
      second +
      `</h1>`;
  }
  
  // 1초에 한번씩 실행되야 하는 것
  function startFunction() {
    currentDate = new Date();
    start_time = Date.now();
    intervalId = setInterval(function () {
      capture_compareHuman("http://localhost:5000/compare-human", baseHuman)
        .then((result) => {
          const compare_result = result.result;
          var cur_time = Date.now();
          let timer = time_processing(Math.floor((cur_time - start_time) / 1000));
          // 여기서 Total Time을 바꿔줍니다.
          time_set(timer[0], timer[1], timer[2]);
          if (compare_result === "정상") {
            sameHuman = true;
          } else {
            sameHuman = false;
          }
          check1Num++;
        })
        .catch((error) => {
          console.error(error);
        });
    }, 1000);
    if (video.paused) {
      video.play();
    }
  }
  
  function studyFunction() {
    interval3Id = setInterval(function () {
      capture_studyHuman("http://localhost:5000/study-human").then((result) => {
        const compare_result = result.result;
        check3Num++;
        // 같은 사람이면서 공부 하고 있음
        if (compare_result == "정상" && sameHuman) {
          normal++;
        }
        if (check3Num % 5 == 0) {
          // 그래프 바꿔주기
          changeGraph();
  
          if (normal > 2) {
            totalReward += (normal - 2) * 10;
            total_normal++;
          } else {
            total_fail++;
          }
          // maxRate 설정
          if (maxRate < normal * 20) {
            maxRate = normal * 20;
          }
          if (minRate > normal * 20) {
            minRate = normal * 20;
          }
          normal = 0;
        }
      });
    }, 3000);
  }
  
  function changeInfoStart() {
    let currentDate = new Date();
    dateInfo.innerHTML =
      `<h1 class="text-pop-small", id="dateInfo">` +
      currentDate.getDate() +
      `:` +
      (currentDate.getMonth() + 1) +
      `:` +
      currentDate.getFullYear() +
      `</h1>`;
  
    nameInfo.innerHTML =
      `<h1 class="text-pop-small", id="nameInfo">` + input_name.value + `</h1>`;
    startTimeInfo.innerHTML =
      `<h1 class="text-pop-small", id="startTimeInfo">` +
      cuurentDate.getHours() +
      `:` +
      currentDate.getMinutes() +
      `:` +
      currentDate.getSeconds() +
      `</h1>`;
  }
  
  function changeInfoEnd() {
    let currentDate = new Date();
    endTimeInfo.innerHTML =
      `<h1 class="text-pop-small", id="startTimeInfo">` +
      currentDate.getHours() +
      `:` +
      currentDate.getMinutes() +
      `:` +
      currentDate.getSeconds() +
      `</h1>`;
  }
  
  function changeTimeEnd() {
    minute = total_normal / 4;
    second = (total_normal % 4) * 15;
    endTimeInfo.innerHTML =
      `<h1 class="text-pop-large", id="endTimeInfo">` +
      minute +
      `:` +
      second +
      `</h1>`;
  }
  
  function changeRate_and_Reward_End() {
    ttrwd.innerHTML =
      `<h1 class="text-pop-large", id="endTimeInfo">` + totalReward  + `</h1>`;
  }
  
  function changeGraph() {}
  
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
        }
      }, 150);
  
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
    });
  }