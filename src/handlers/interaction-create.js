
import { Collection } from 'discord.js';

export function createInteractionHandler({ commands, services }) {
  return async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);

        if (!command) {
          return;
        }

        await command.execute(interaction, services);
        return;
      }

      if (interaction.isButton()) {
        await services.verification.handleButton(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await services.verification.handleModal(interaction);
      }
    } catch (error) {
      const payload = {
        content: 'Something went wrong while processing that interaction.',
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }

      console.error(error);
    }
  };
}

export async function loadCommands() {
  const commands = new Collection();
  const module = await import('../commands/verify.js');
  commands.set(module.default.data.name, module.default);
  return commands;
}
