import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export default definePluginSettings({
    rememberAcrossRestarts: {
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
        description: "keep the flag on someone forever (saved to disk) instead of only for the current Discord session - most people only slip up once, so this matters",
    },
});
