/*
Runs on page load to manage page resources. As of now, it simply manages the current page using page manager. 
*/
window.onload = pageManager()
const burgermenuicon = document.getElementsByClassName("burgermenuicon")[0]
const navbuttons = document.getElementsByClassName("navbuttons")[0]

burgermenuicon.addEventListener('click', ()=>{
    navbuttons.classList.toggle('active');
})
/*
Handles current page highlight
*/
function pageManager(){
    //newDir is the object obtained from the previous page
    var newDir = getPressedButton();
        

    //menuButtons is a list of all anchor elements in current page. 
    var menuButtons = document.getElementsByClassName('navbuttons')[0].getElementsByTagName('a');

    console.log("My new dir is" + newDir);

    for (var i = 0; i < menuButtons.length; i++) {
        if (menuButtons[i].href === newDir) {
            menuButtons[i].classList.add('current_tab')
            break;
        }
    }
}

/*
Simple function that sets the current directed_page, called in navbar page buttons
*/
function setPressedButton(clickedButton){
    window.sessionStorage.setItem("directed_page", clickedButton);
}

/*
Returns page being directed to if it exists. Returns homepage if it does not exist.
*/
function getPressedButton(){
    var actionPressed = window.sessionStorage.getItem("directed_page");
    if(actionPressed){
        return actionPressed;
    }
    else{
        return null
    }
}