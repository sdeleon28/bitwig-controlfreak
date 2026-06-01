package dev.tradcode.groupctl;

import java.util.ArrayList;

public class BitwigTrack {
    Integer id;
    String name;
    boolean isGroup;
    int depth; // (0=top, 1=child, 2=grandchild)
    ArrayList<BitwigTrack> children;
}
