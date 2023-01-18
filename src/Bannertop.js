import React from "react";
import pic from "./cont_song_desk.png";
import mobileimg from "./cont_song_mob.png";

function Bannertop(){
    return(
        <>
        <div className="deskviews">
        <a href="http://contextbomb.com/songsearch">
          <img className="deskview" src={pic} />
        </a>
        </div>
        <div className="mobileviews">
        <a href="http://contextbomb.com/songsearch">
          <img className="mobileview" src={mobileimg} />
        </a>
        </div>
        </>
    );
}

export default Bannertop;