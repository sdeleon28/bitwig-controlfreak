package dev.tradcode.groupctl.events;

import java.util.List;

public record DevicesSchemaChanged(List<BitwigDevice> devices)
    implements Event {

}
