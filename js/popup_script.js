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
let registerButton;


registerButton = document.getElementById("button-register");

registerButton.addEventListener("click", function () {
  console.log("눌렀는데");
  //todo!, execute_createHuman() every 2 seconds, and if execute_createHuman(), change the textBox's text, using change_text(text)
  registerButton.disabled = true;
  let id = setInterval(function () {
    // Call capture_createHuman() function and change text
    capture_createHuman("http://localhost:5000/create-human")
      .then((result) => {
        if (result.result === "정상입니다.") {
          video.pause();
          const name = prompt(
            "Please enter your name for face registration:"
          );
          if (name) {
            // 만약 얼굴 등록을 원한다면 휴먼 오브젝트 생성
            const popup = window.open("./popup_main.html", "Popup");
            var message = {
              name: name,
              image: result.img,
            };
            popup.postMessage(message, "*");
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



