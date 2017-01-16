//NOTE HOLDER
//if the button is pressed then either hold whatever note is playing or hold the next note played (only works monophonic)
//release the held note when pedal released
//reject any other notes while holding
//everything passes when button released and "ignore unheld" isnt activated
//mute all notes except held notes if "ignore unheld" is actvated

autowatch = 1;
inlets =4;
var isHolding = 0;
var noteHeld = 0;
var midibyte=0;
var midimessage=0;

//var playUnheldNotes = 1; //option: to play notes when pedal is not held set to nonzero

var pedalHeld = 0;
var holdingNote = 0;
var playingNote = 0;

function HOLDING() {
	log("hoo");
			if (this.patcher.getnamed('isInverted').getvalueof() > 0) 
				{pedalUp();} else {pedalDown();};
}
function Released() {
	log("release");
			if (this.patcher.getnamed('isInverted').getvalueof() > 0) 
 				{pedalDown();} else {pedalUp();};
}

// parse midi data direct from "midiin" object:
var miditype;
var counter = 0;
var midichunk = new Array(); //used to assemble the MIDI in into lists of 2 (pgm, ch press) or 3 (everything else)
function msg_int(v){
    if(v>=128 && v<=239){ 
        counter = 0;
        midichunk = new Array();
	}
    if(v>=128 && v<=143) miditype = 7; //notes off <noteID&ch,note#,vel>
    if(v>=144 && v<=159) miditype = 1; //notes <noteID&ch,note#,vel>
    if(v>=160 && v<=175) miditype = 2; //after(poly)touch <polyID&ch,note#,val>
    if(v>=176 && v<=191) miditype = 3; //ctlr <ctlID&ch, cc#, val>
    if(v>=192 && v<=207) miditype = 4; //pgm ch <pgmID&ch,val>
    if(v>=208 && v<=223) miditype = 5; //ch. pressure <chprID&ch, val>
    if(v>=224 && v<=239) miditype = 6; //pitch bend <pbID&ch, msb, lsb>

    switch(miditype){
        case 1: //note ON
            midichunk[counter] = v;
			if (counter==2) {
				log("noteon:",midichunk[0],midichunk[1],midichunk[2]);
				if (playingNote > 0 && this.patcher.getnamed('forceMono').getvalueof() > 0)
				{	//if its in force mono mode and a note was already playing then kill it
					outlet(0,midichunk[0]-16); outlet(0,playingNote); outlet(0,64);
					log("force note off:",midichunk[0]-16,midichunk[1]);
				}
				playingNote = midichunk[1];
				if (holdingNote == 0) 
				{ //if a note isn't already being held
					if (pedalHeld > 0) 
					{//if the pedal is already down and this is the next note, then hold it
						holdingNote = midichunk[1];
						outlet(0,midichunk[0]); outlet(0,holdingNote ); outlet(0,midichunk[2]);
						//this.patcher.getnamed('holdingText').hidden = false;
						log("holding note:",midichunk[0],holdingNote);
					} else {//the pedal isn't down
						if (this.patcher.getnamed('toggleUnheldNotes').getvalueof() == 0 ) 
						{ //if its set to play notes inbetween holders then output the note
							outlet(0,midichunk[0]); outlet(0,midichunk[1]); outlet(0,midichunk[2]);
							log("playing note:",midichunk[0],midichunk[1],midichunk[2]);
						}
					}
				} else {
					log("ignore");
					//a note is being held.  ignore this note
				}
			}
            counter++;
        break;
        
        case 2: //after(poly)touch
             midichunk[counter] = v;
            //if (counter==2) printlet("aftertouch",midichunk[1],midichunk[2]);
            counter++;
        break;
        
        case 3: //cc
            midichunk[counter] = v;
            if (counter==2) {
                //printlet("cc",midichunk[1],midichunk[2]);
            }
            counter++;
        break;
        
        case 4: //pgm changes
             midichunk[counter] = v;
            if (counter==1) {
				log("pgm")
				if (0 <= midichunk[1] <= (arrMasterList.length/2 -1)) {
					for (var midiByte in midichunk) outlet(0,midiByte);
					//currentPatch = midichunk[1];  //can cause infinte loop
					//Refresh();
				}
			}
            counter++;
        break;
        
        case 5: //ch. pressure
             midichunk[counter] = v;
            //if (counter==1) printlet("ch. pressure",midichunk[1]);
            counter++;
        break;
        
        case 6://pitch bend
            midichunk[counter] = v;
            //if (counter==2) printlet("bend",midichunk[0]-223,midichunk[1]);
            counter++;
        break;
        
        case 7: //note OFF 
            midichunk[counter] = v;
            if (counter==2) {
				log("noteoff:",midichunk[0],midichunk[1],midichunk[2]);
				midichunk[2] = 64; //hack:ableton only responds to nonzero but it receives as 0
				if (holdingNote == 0 && this.patcher.getnamed('toggleUnheldNotes').getvalueof() == 0)
				{ //if no note is being held then send the note off
					outlet(0,midichunk[0]); outlet(0,midichunk[1]); outlet(0,midichunk[2]);
					log("note off:",midichunk[0],midichunk[1]);
				}
				if (playingNote == midichunk[1])
				{ //if the most recently played note released then mark nothing as recent
					outlet(0,127+midichunk[0]); outlet(0,midichunk[1]); outlet(0,midichunk[2]);
					playingNote = 0;
				}
			}
            counter++;
        break;
    }
}

function pedalDown() {
	log("downpedalHeldis",pedalHeld);
	if (pedalHeld == 0) { //ignore the message if the pedal is already down.
		log("pedal down");
		pedalHeld = 1; //be ready to hold current or next note
		if (playingNote > 0) 
		{ 	//if a note is playing, hold it
			//messnamed("holdingNote",playingNote);
			this.patcher.getnamed('holdingText').hidden = false;
			this.patcher.getnamed('holdingText').set("holding "+playingNote);
			holdingNote = playingNote;
			log("holding previous note:",midichunk[0],playingNote);								
		}
	
	}
}
function pedalUp() {
	post("uppedalHeldis"+pedalHeld);
	if (pedalHeld) { //ignore the message if the pedal is already up.
		pedalHeld = 0;
		log("pedal up",holdingNote);
		if (holdingNote > 0) 
		{	//if a note was being held release it
			this.patcher.getnamed('holdingText').hidden = true;
			outlet(0,128); outlet(0,holdingNote); outlet(0,64);
			log("releasing note:",holdingNote);
			holdingNote = 0;
		}
	}
}

function log() {
  for(var i=0,len=arguments.length; i<len; i++) {
    var message = arguments[i];
    if(message && message.toString) {
      var s = message.toString();
      if(s.indexOf("[object ") >= 0) {
        s = JSON.stringify(message);
      }
      post(s);
    }
    else if(message === null) {
      post("<null>");
    }
    else {
      post(message);
    }
  }
  post("\n");
}
 
log("___________________________________________________");
log("Reload:", new Date);