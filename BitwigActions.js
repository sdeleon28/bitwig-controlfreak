/**
 * Bitwig Action IDs
 * Constants for all available Bitwig actions that can be invoked via Application.getAction()
 * @namespace
 */
var BitwigActions = {
    // ========================================================================
    // Transport
    // ========================================================================
    PLAY: "Play Transport",
    CONTINUE_PLAY: "Continue Play Transport",
    PLAY_FROM_START: "Play Transport From Start",
    STOP: "Stop Transport",
    PLAY_OR_STOP: "Play or Stop Transport",
    PLAY_OR_PAUSE: "Play or Pause Transport",
    CONTINUE_OR_STOP: "Continue Playback or Stop",
    PLAY_FROM_START_OR_STOP: "Play From Start or Stop Transport",
    TOGGLE_RECORD: "Toggle Record",
    TAP_TEMPO: "Tap Tempo",

    // ========================================================================
    // Transport Toggles
    // ========================================================================
    TOGGLE_ARRANGER_LOOP: "toggle_arranger_loop",
    TOGGLE_PUNCH_IN: "toggle_punch_in",
    TOGGLE_PUNCH_OUT: "toggle_punch_out",
    TOGGLE_PLAYHEAD_FOLLOW: "toggle_playhead_follow",
    TOGGLE_AUTOMATION_FOLLOW: "toggle_automation_follow",
    TOGGLE_METRONOME: "toggle_metronome",
    TOGGLE_GROOVE: "toggle_groove",
    TOGGLE_ARRANGER_OVERDUB: "toggle_arranger_overdub",
    TOGGLE_CLIP_LAUNCHER_OVERDUB: "toggle_clip_launcher_overdub",
    TOGGLE_ARRANGER_AUTOMATION_WRITE: "toggle_arranger_automation_write",
    TOGGLE_CLIP_LAUNCHER_AUTOMATION_WRITE: "toggle_clip_launcher_automation_write",

    // ========================================================================
    // Tempo
    // ========================================================================
    INCREASE_TEMPO_1_BPM: "increase_tempo_one_bpm",
    DECREASE_TEMPO_1_BPM: "decrease_tempo_one_bpm",
    INCREASE_TEMPO_0_1_BPM: "increase_tempo_one_tenth_bpm",
    DECREASE_TEMPO_0_1_BPM: "decrease_tempo_one_tenth_bpm",

    // ========================================================================
    // Navigation - Playhead
    // ========================================================================
    JUMP_TO_NEXT_BAR: "jump_to_beginning_of_next_bar",
    JUMP_TO_PREV_BAR: "jump_to_beginning_of_previous_bar",
    JUMP_FORWARD_8_BARS: "jump_forward_8_bars",
    JUMP_BACKWARD_8_BARS: "jump_backward_8_bars",
    JUMP_TO_CURRENT_BAR: "jump_to_beginning_of_current_bar",
    JUMP_TO_ARRANGEMENT_START: "jump_to_beginning_of_arrangement",
    JUMP_TO_ARRANGEMENT_END: "jump_to_end_of_arrangement",
    JUMP_TO_LOOP_START: "jump_to_beginning_of_arranger_loop",
    JUMP_TO_LOOP_END: "jump_to_end_of_arranger_loop",
    JUMP_TO_NEXT_CUE: "jump_to_next_cue_marker",
    JUMP_TO_PREV_CUE: "jump_to_previous_cue_marker",
    JUMP_TO_PLAYBACK_START: "jump_to_playback_start_time",

    // ========================================================================
    // Launch
    // ========================================================================
    LAUNCH_FROM_PLAYBACK_START: "launch_from_playback_start_time",
    LAUNCH_FROM_ARRANGEMENT_START: "launch_from_beginning_of_arrangement",
    LAUNCH_FROM_ARRANGEMENT_END: "launch_from_end_of_arrangement",
    LAUNCH_FROM_LOOP_START: "launch_from_beginning_of_arranger_loop",
    LAUNCH_FROM_LOOP_END: "launch_from_end_of_arranger_loop",
    LAUNCH_NEXT_CUE: "launch_next_cue_marker",
    LAUNCH_PREV_CUE: "launch_previous_cue_marker",
    LAUNCH_SCENE: "launch_scene",
    LAUNCH_NEXT_SCENE: "launch_next_scene",
    LAUNCH_PREV_SCENE: "launch_prev_scene",
    LAUNCH_NEXT_SLOT: "launch_next_slot",
    LAUNCH_PREV_SLOT: "launch_prev_slot",
    LAUNCH: "launch",

    // ========================================================================
    // Markers
    // ========================================================================
    INSERT_CUE_MARKER: "insert_arranger_cue_marker_at_play_position",
    TOGGLE_CUE_MARKER_VISIBILITY: "toggle_arranger_cue_marker_visibility",
    TOGGLE_TIME_SIG_MARKER_VISIBILITY: "toggle_time_signature_marker_visibility",

    // ========================================================================
    // Time Editing (IMPORTANT for copy feature)
    // ========================================================================
    INSERT_SILENCE: "insert_silence",
    CUT_TIME: "cut_and_pull",
    PASTE_TIME: "paste_and_push",
    DUPLICATE_TIME: "duplicate_and_push",
    REMOVE_TIME: "delete_and_pull",
    LOOP_SELECTION: "Loop Selection",

    // ========================================================================
    // Content Editing
    // ========================================================================
    CONSOLIDATE: "Consolidate",
    REVERSE: "reverse",
    REVERSE_PATTERN: "reverse_pattern",
    SCALE_TIME: "scale_time",
    SCALE_TIME_DOUBLE: "scale_time_double",
    SCALE_TIME_HALF: "scale_time_half",
    SCALE_EACH_DOUBLE: "scale_each_double",
    SCALE_EACH_HALF: "scale_each_half",
    DOUBLE_CONTENT: "double_content",
    SPLIT: "Split",

    // ========================================================================
    // Bounce
    // ========================================================================
    BOUNCE_IN_PLACE_PRE_FX: "bounce_in_place",
    BOUNCE_IN_PLACE_PRE_FADER: "bounce_in_place_pre_fader",
    BOUNCE_IN_PLACE_POST_FADER: "bounce_in_place_post_fader",
    BOUNCE: "bounce",

    // ========================================================================
    // Transpose
    // ========================================================================
    TRANSPOSE_SEMITONE_DOWN: "transpose_semitone_down",
    TRANSPOSE_SEMITONE_UP: "transpose_semitone_up",
    TRANSPOSE_OCTAVE_DOWN: "transpose_octave_down",
    TRANSPOSE_OCTAVE_UP: "transpose_octave_up",

    // ========================================================================
    // Gain
    // ========================================================================
    GAIN_PLUS_1DB: "increase_gain_1db",
    GAIN_PLUS_6DB: "increase_gain_6db",
    GAIN_MINUS_1DB: "reduce_gain_1db",
    GAIN_MINUS_6DB: "reduce_gain_6db",

    // ========================================================================
    // Nudge Events
    // ========================================================================
    NUDGE_EVENTS_BACKWARD_FINE: "nudge_events_one_bar_earlier",
    NUDGE_EVENTS_BACKWARD_STEP: "nudge_events_one_step_earlier",
    NUDGE_EVENTS_FORWARD_FINE: "nudge_events_one_bar_later",
    NUDGE_EVENTS_FORWARD_STEP: "nudge_events_one_step_later",
    MAKE_EVENTS_SHORTER_FINE: "make_events_one_bar_shorter",
    MAKE_EVENTS_SHORTER_STEP: "make_events_one_step_shorter",
    MAKE_EVENTS_LONGER_FINE: "make_events_one_bar_longer",
    MAKE_EVENTS_LONGER_STEP: "make_events_one_step_longer",

    // ========================================================================
    // Slide Content
    // ========================================================================
    SLIDE_CONTENT_LEFT: "slide_content_step_left",
    SLIDE_CONTENT_RIGHT: "slide_content_step_right",
    SET_CLIP_START: "Set Clip Start",
    SET_EVENT_START: "set_event_start",
    SET_EVENT_END: "set_event_end",

    // ========================================================================
    // Quantize
    // ========================================================================
    QUANTIZE: "quantize",
    QUANTIZE_AGAIN: "quantize_again",
    QUANTIZE_AUDIO: "quantize_audio",
    QUANTIZE_AUDIO_AGAIN: "quantize_audio_again",
    LEGATO: "legato",
    FIXED_LENGTH: "fixed_length",

    // ========================================================================
    // Audio Processing
    // ========================================================================
    NORMALIZE: "normalize",
    DETECT_TEMPO: "detect_tempo",
    STRETCH_TO_TEMPO: "stretch_to_tempo",
    STRETCH_TO_PROJECT_TEMPO: "stretch_to_project_tempo",
    STRETCH_TO_ANALYZED_TEMPO: "stretch_to_analyzed_tempo",
    SLIDE_TO_PREV_ONSET: "slide_to_previous_onset",
    SLIDE_TO_NEXT_ONSET: "slide_to_next_onset",

    // ========================================================================
    // Fades
    // ========================================================================
    FADE_IN: "fade_in",
    FADE_OUT: "fade_out",
    RESET_FADES: "reset_fades",
    AUTO_FADE: "auto_fade",
    AUTO_CROSSFADE: "auto_crossfade",

    // ========================================================================
    // Slicing
    // ========================================================================
    SLICE_IN_PLACE: "slice_in_place",
    SLICE_AT_REPEATS: "slice_at_repeats",
    SLICE_TO_DRUM_TRACK: "slice_to_drum_track",
    SLICE_TO_MULTI_SAMPLER: "slice_to_multi_sampler_track",

    // ========================================================================
    // Grid & Snapping
    // ========================================================================
    LARGER_GRID: "double_grid_size",
    SMALLER_GRID: "half_grid_size",
    TOGGLE_SNAP: "toggle_snapping",
    TOGGLE_SNAP_TO_EVENTS: "toggle_object_snapping",
    TOGGLE_SNAP_TO_GRID: "toggle_absolute_grid_snapping",
    TOGGLE_SNAP_TO_GRID_OFFSET: "toggle_relative_grid_snapping",
    TOGGLE_ADAPTIVE_GRID: "toggle_adaptive_grid",
    LARGER_GRID_SUBDIVISION: "prev_grid_subdivision",
    SMALLER_GRID_SUBDIVISION: "next_grid_subdivision",

    // ========================================================================
    // Tools
    // ========================================================================
    TOOL_POINTER: "select_object_selection_tool",
    TOOL_TIME_SELECTION: "select_time_selection_tool",
    TOOL_PEN: "select_create_tool",
    TOOL_ERASER: "select_erase_tool",
    TOOL_KNIFE: "select_cut_tool",

    // ========================================================================
    // Curve Tools
    // ========================================================================
    CURVE_POINTER: "select_curve_pointer_tool",
    CURVE_PENCIL: "select_curve_pencil_tool",
    CURVE_STEP: "select_curve_step_tool",
    CURVE_HALF_STEP: "select_curve_half_step_tool",
    CURVE_SAW_UP: "select_curve_saw_up_tool",
    CURVE_SAW_DOWN: "select_curve_saw_down_tool",
    CURVE_TRIANGLE: "select_curve_triangle_tool",

    // ========================================================================
    // Panels
    // ========================================================================
    TOGGLE_BROWSER: "toggle_browser_panel",
    TOGGLE_FILE_BROWSER: "toggle_file_browser_panel",
    TOGGLE_DEVICE: "toggle_device_panel",
    TOGGLE_ARRANGER: "toggle_arranger",
    TOGGLE_DETAIL_EDITOR: "toggle_detail_editor",
    TOGGLE_AUTOMATION_EDITOR: "toggle_automation_editor",
    TOGGLE_MIXER: "toggle_mixer",
    TOGGLE_KEYBOARD: "focus_or_toggle_onscreen_keyboard_panel",
    TOGGLE_INSPECTOR: "toggle_inspector",
    TOGGLE_STUDIO_IO: "toggle_studio_io",
    TOGGLE_PROJECT: "toggle_song_panel",
    TOGGLE_MAPPINGS_BROWSER: "toggle_mappings_browser_panel",
    TOGGLE_EDIT_VIEW: "Toggle maximized editing mode",

    // ========================================================================
    // Zoom - Arranger
    // ========================================================================
    ARRANGER_ZOOM_IN: "arranger_zoom_in",
    ARRANGER_ZOOM_OUT: "arranger_zoom_out",
    ARRANGER_ZOOM_TO_FIT: "arranger_zoom_to_fit",
    ARRANGER_ZOOM_TO_SELECTION: "arranger_zoom_to_selection",
    ARRANGER_ZOOM_TO_FIT_SELECTION_OR_ALL: "arranger_zoom_to_fit_selection_or_all",
    ARRANGER_ZOOM_LANES_IN_ALL: "arranger_zoom_in_lane_heights_all",
    ARRANGER_ZOOM_LANES_OUT_ALL: "arranger_zoom_out_lane_heights_all",
    ARRANGER_ZOOM_LANES_IN_SELECTED: "arranger_zoom_in_lane_heights_selected",
    ARRANGER_ZOOM_LANES_OUT_SELECTED: "arranger_zoom_out_lane_heights_selected",

    // ========================================================================
    // Zoom - Detail Editor
    // ========================================================================
    DETAIL_ZOOM_IN: "detail_editor_zoom_in",
    DETAIL_ZOOM_OUT: "detail_editor_zoom_out",
    DETAIL_ZOOM_TO_FIT: "detail_editor_zoom_to_fit",
    DETAIL_ZOOM_TO_SELECTION: "detail_editor_zoom_to_selection",
    DETAIL_ZOOM_LANES_IN: "detail_editor_zoom_in_lane_heights",
    DETAIL_ZOOM_LANES_OUT: "detail_editor_zoom_out_lane_heights",

    // ========================================================================
    // Zoom - Mixer
    // ========================================================================
    MIXER_ZOOM_IN_ALL: "mixer_zoom_in_track_width_all",
    MIXER_ZOOM_OUT_ALL: "mixer_zoom_out_track_width_all",
    MIXER_ZOOM_IN_SELECTED: "mixer_zoom_in_track_width_selected",
    MIXER_ZOOM_OUT_SELECTED: "mixer_zoom_out_track_width_selected",

    // ========================================================================
    // Track Groups
    // ========================================================================
    FOLD_TOP_LEVEL_GROUPS: "toggle_top_level_track_groups_expanded",
    FOLD_ALL_GROUPS: "toggle_all_track_groups_expanded",

    // ========================================================================
    // Track Controls
    // ========================================================================
    TOGGLE_TRACK_MUTE: "toggle_track_mute",
    TOGGLE_TRACK_SOLO: "toggle_track_solo",
    TOGGLE_TRACK_ARM: "toggle_track_arm",
    CLEAR_MUTE: "clear_mute",
    CLEAR_SOLO: "clear_solo",
    CLEAR_ARM: "clear_arm",

    // ========================================================================
    // Track Playback
    // ========================================================================
    SWITCH_TO_ARRANGER_ALL: "switch_playback_to_arranger_for_all_tracks",
    SWITCH_TO_ARRANGER_SELECTED: "switch_playback_to_arranger_for_selected_tracks",
    STOP_ALL_TRACKS: "stop_playback_of_all_tracks",
    STOP_SELECTED_TRACKS: "stop_playback_of_selected_tracks",

    // ========================================================================
    // Track Conversion
    // ========================================================================
    CONVERT_TO_INSTRUMENT: "convert_to_instrument_track",
    CONVERT_TO_AUDIO: "convert_to_audio_track",
    CONVERT_TO_HYBRID: "convert_to_hybrid_track",
    TOGGLE_STOP_BUTTON: "toggle_has_stop_button",

    // ========================================================================
    // Automation
    // ========================================================================
    RESTORE_AUTOMATION: "restore_automation_control",
    DELETE_ALL_PROJECT_AUTOMATION: "delete_all_project_automation",
    DELETE_SELECTION_AUTOMATION: "delete_all_automation_owned_by_selection",
    TOGGLE_AUTOMATION_ALL: "toggle_automation_shown_for_all_tracks",
    TOGGLE_AUTOMATION_SELECTED: "toggle_automation_shown_for_selected_tracks",
    TOGGLE_EXISTING_AUTOMATION_ALL: "toggle_existing_automation_shown_for_all_tracks",
    TOGGLE_EXISTING_AUTOMATION_SELECTED: "toggle_existing_automation_shown_for_selected_tracks",

    // ========================================================================
    // Note Expression
    // ========================================================================
    CLEAR_ALL_EXPRESSIONS: "note_expression.clear.all",
    CLEAR_SELECTED_EXPRESSION: "note_expression.clear.selected",
    NOTE_COLOR_BY_CLIP: "note_color_mode.clip",
    NOTE_COLOR_BY_CHANNEL: "note_color_mode.channel",
    NOTE_COLOR_BY_PITCH: "note_color_mode.pitch_class",
    NOTE_COLOR_BY_VELOCITY: "note_color_mode.velocity",

    // ========================================================================
    // Distribution
    // ========================================================================
    DISTRIBUTE_KEYS: "distribute_keys_equally",
    DISTRIBUTE_VELOCITY: "distribute_velocity_equally",
    DISTRIBUTE_SELECT: "distribute_select_equally",

    // ========================================================================
    // Value Adjustment
    // ========================================================================
    VALUE_STEP_UP: "adjust_event_value_step_up",
    VALUE_STEP_DOWN: "adjust_event_value_step_down",
    VALUE_FINE_UP: "adjust_event_value_fine_step_up",
    VALUE_FINE_DOWN: "adjust_event_value_fine_step_down",

    // ========================================================================
    // Detail Editor
    // ========================================================================
    TOGGLE_TRACK_VS_CLIP_EDITING: "Toggle Track Timeline vs. Clip Content Editing",
    TOGGLE_FOLDED_NOTE_LANES: "toggle_folded_note_lanes",
    TOGGLE_LAYER_LIST: "toggle_layer_list_visibility",
    TOGGLE_EXPRESSION_AREA: "toggle_expression_visibility",
    TOGGLE_AUTOMATION_AREA: "toggle_automation_visibility",
    TOGGLE_MICRO_PITCH: "toggle_micro_pitch_editing",
    TOGGLE_LARGE_TRACK_HEIGHT: "toggle_double_or_single_row_track_height",
    UNLOCK_ALL_LAYERS: "unlock_all_layers",
    TOGGLE_LAYER_LOCK: "toggle_layer_lock",
    TOGGLE_LAYER_VISIBILITY: "toggle_layer_visibility",

    // ========================================================================
    // Browser
    // ========================================================================
    FOCUS_BROWSER_SEARCH: "focus_browser_search_field",
    SELECT_NEXT_SEARCH_SOURCE: "select_next_search_source",
    SELECT_PREV_SEARCH_SOURCE: "select_prev_search_source",
    TOGGLE_SOURCE_BROWSER: "toggle_source_browser",
    SHOW_PRESETS_FOR_DEVICE: "show_presets_for_device",
    TOGGLE_PREVIEW: "toggle_preview_playback_of_selected_file",
    TOGGLE_FAVORITES: "toggle_show_favorites",
    TOGGLE_FAVORITE: "toggle_favorite",
    INSERT_FROM_LIBRARY: "show_insert_popup_browser",

    // ========================================================================
    // Device
    // ========================================================================
    TOGGLE_DEVICE_WINDOW: "toggle_plugin_device_window",
    TOGGLE_PRIMARY_DEVICE_WINDOW: "toggle_primary_device_window",
    LOAD_DEFAULT_PRESET: "load_default_preset",
    SAVE_DEFAULT_PRESET: "save_default_preset",

    // ========================================================================
    // Takes
    // ========================================================================
    SELECT_PREV_TAKE: "select_previous_take",
    SELECT_NEXT_TAKE: "select_next_take",
    EXPAND: "expand",
    FOLD_TO_TAKES: "multiplex",

    // ========================================================================
    // Export
    // ========================================================================
    EXPORT_AUDIO: "Export Audio",
    EXPORT_MIDI: "export_midi",
    EXPORT_PROJECT: "export_project",

    // ========================================================================
    // Selection
    // ========================================================================
    SELECT_EVERYTHING: "select_everything",

    // ========================================================================
    // Miscellaneous
    // ========================================================================
    RESET_VU_METERS: "Reset VU Meters",
    TOGGLE_BIG_METERS: "toggle_meter_section",
    TOGGLE_LARGE_CLIP_HEIGHT: "toggle_double_row_clip_height",
    TOGGLE_REALTIME_RULER: "toggle_real_time_ruler_visibility",
    DISABLE_UNUSED_SENDS: "disable_all_unused_sends",
    SHOW_ADVANCED_SETTINGS: "show_advanced_settings",
    PLAY_FROM_EDITOR_LEFT: "play_from_left_edge_of_current_editor",
    SHOW_IN_FINDER: "show_in_finder",
    EDIT_FILE_METADATA: "edit_file_meta_data",

    // ========================================================================
    // Modes
    // ========================================================================
    MODE_1: "Switch to Mode 1",
    MODE_2: "Switch to Mode 2",
    MODE_3: "Switch to Mode 3",
    MODE_4: "Switch to Mode 4",
    NEXT_MODE: "Select Next Mode",
    PREV_MODE: "Select Previous Mode",

    // ========================================================================
    // Sub-panels
    // ========================================================================
    SUBPANEL_1: "Select sub panel 1",
    SUBPANEL_2: "Select sub panel 2",
    SUBPANEL_3: "Select sub panel 3",
    SUBPANEL_4: "Select sub panel 4",
    NEXT_SUBPANEL: "Select next sub panel",
    PREV_SUBPANEL: "Select previous sub panel",

    // ========================================================================
    // Mixer Views
    // ========================================================================
    SHOW_TRACK_IO: "Show Track Inputs and Outputs",
    SHOW_SENDS: "Show Sends",
    SHOW_CROSSFADES: "Show Crossfades",
    SHOW_FX_TRACKS: "Show Effect Tracks",
    TOGGLE_DEACTIVATED_VISIBILITY: "toggle_deactivated_chains_visibility",

    // ========================================================================
    // Zone Nudge
    // ========================================================================
    NUDGE_ZONE_LEFT: "nudge_zone_left",
    NUDGE_ZONE_LEFT_COARSE: "coarse_nudge_zone_left",
    NUDGE_ZONE_RIGHT: "nudge_zone_right",
    NUDGE_ZONE_RIGHT_COARSE: "coarse_nudge_zone_right",
    NUDGE_ZONE_UP: "nudge_zone_up",
    NUDGE_ZONE_UP_COARSE: "coarse_nudge_zone_up",
    NUDGE_ZONE_DOWN: "nudge_zone_down",
    NUDGE_ZONE_DOWN_COARSE: "coarse_nudge_zone_down"
};
