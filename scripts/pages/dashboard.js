// Managing the buttons for changing pages begins ---->
const logOut = document.getElementById("logOut");
logOut.addEventListener("click", goToLogIn);

function goToLogIn(){ 
    window.location.assign("./logIn.html")
}
// <---- Managing the buttons for changing pages ends