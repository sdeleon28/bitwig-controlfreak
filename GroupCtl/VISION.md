# groupctl

This project is a controller surface that mixes a Launchpad and a Midi Fighter
Twister to make many bitwig features accessible via controls.

Pressing things on the Launchpad changes twister behavior.

The launchpad is organized in pages. Each page being the powerful UI for a
program that controls Bitwig parameters.

## groupctl

The bottom-right quadrant displays colored pads that map to tracks via a
convention. Naming a track "drms (3)" places it in the third pad of the 
bottom-right quadrant (1-indexed 1..16).

Selecting a group deploys the track in that group to the bottom-left quadrant
(trackctl).

## trackctl

Controls tracks within the selected group. Follows the same conventions

Pressing a pad in trackctl may do different things depending of the active pad
mode (select, mute, solo, rec controlled by the buttons on the right side of
the launchpad: stop, mute, solo, record arm respectively).

The twister will display, react-to and change the vol / pan of the tracks in
the selected group. The twister has different context-sensitive programs that
will be covered later.

When in select mode, when you select a track, it deploys the devices to the
devicectl quadrant.

## devicectl

Top-left quadrant. Activates devices and expands them in the biwtig UI
(displaying RCs as well). When a device is selected from this quadrant, the
twister goes into device RC mode. Controls the same encoders you see on the
screen.

## fxctl

Bottom two rows of the top-right quadrant. Selecting a group, then an FX pad
makes the Twister encoders go into TwisterSendTracksToFxMode. Selecting a track,
then an FX pad makes the Twister encoders go into TwisterSendTrackToAllFxCtl
(describes in more detail in the roadmap).

## twister programs

* TwisterVolPanCtl
* TwisterSendTracksToFxCtl
* TwisterSendTrackToAllFxCtl

## pad modes

they make the trackctl program behave differently

* select (Stop button)
* mute
* solo
* rec

## architecture

The codebase already has patterns about how to do pretty much everything we need
to do. We do event sourcing. The system is very orthogonal and de-coupled and
must be maintained that way.

### Braod types of classes:

* trackers
  * these track information about the project state in bitwig
  * bitwig API is not allowed to leak outside of trackers
  * trackers and the rest of the system communicate via events
* device wrapper
  * communicate with the twister or launchpad at a low level
    ("paint pad 14 green)
  * they only know about how to communicate with the device but don't govern
    the general business rules of our app. they expose events for higher level
    classes to control the devices without concerning themselves with low-level
    details
* ctl classes
    * generally control one portion of a device at a high level
