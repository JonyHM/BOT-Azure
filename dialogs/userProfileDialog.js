const {
  ComponentDialog,
  ConfirmPrompt,
  DialogSet,
  DialogTurnStatus,
  NumberPrompt,
  TextPrompt,
  WaterfallDialog
} = require('botbuilder-dialogs');
const { UserProfile } = require('../userProfile');

const MESSAGE_PROMPT = 'MESSAGE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class UserProfileDialog extends ComponentDialog {
  constructor(userState) {
    super('userProfileDialog');

    this.userProfile = userState.createProperty(USER_PROFILE);

    this.addDialog(new TextPrompt(NAME_PROMPT));
    this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
    this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));

    this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
      this.nameStep.bind(this),
      this.nameConfirmStep.bind(this),
      this.ageStep.bind(this),
      this.confirmStep.bind(this),
      this.summaryStep.bind(this)
    ]));

    this.initialDialogId = WATERFALL_DIALOG;
  }

  /**
   * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
   * If no dialog is active, it will start the default dialog.
   * @param {*} turnContext
   * @param {*} accessor
   */
  async run(turnContext, accessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(turnContext);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  async nameStep(step) {
    return await step.prompt(NAME_PROMPT, 'Qual o seu nome? (Essa seria a primeira pergunta)');
  }

  async sizeStep(step) {
    step.values.name = step.result;

    await step.context.sendActivity(`Olá ${ step.result }! Vamos ao pedido?`);

    return await step.prompt(MESSAGE_PROMPT, 'Gostaria de um açaí de qual tamanho? Opções são: 300ml , 500ml ou 700ml');
  }

  async nameConfirmStep(step) {
    step.values.size = step.result;

    // We can send messages to the user at any point in the WaterfallStep.
    await step.context.sendActivity(`Então quer um açaí de ${ step.result }.`);

    // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
    return await step.prompt(MESSAGE_PROMPT, 'Gostaria de me informar sua idade?', ['sim', 'nao']);
  }

  async ageStep(step) {
    if (step.result) {
      // User said "yes" so we will be prompting for the age.
      // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
      const promptOptions = { prompt: 'Por favor, me informe sua idade.', retryPrompt: 'O valor inserido deve ser maior do que 0 e menos 150.' };

      return await step.prompt(NUMBER_PROMPT, promptOptions);
    } else {
      // User said "no" so we will skip the next step. Give -1 as the age.
      return await step.next(-1);
    }
  }

  async confirmStep(step) {
    step.values.age = step.result;

    const msg = step.values.age === -1 ? 'Idade não informada.' : `Tenho aqui que você tem ${ step.values.age } anos de idade.`;

    // We can send messages to the user at any point in the WaterfallStep.
    await step.context.sendActivity(msg);

    // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
    return await step.prompt(CONFIRM_PROMPT, { prompt: 'Ta certo?' });
  }

  async summaryStep(step) {
    if (step.result) {
      // Get the current profile object from user state.
      const userProfile = await this.userProfile.get(step.context, new UserProfile());

      userProfile.transport = step.values.transport;
      userProfile.name = step.values.name;
      userProfile.age = step.values.age;

      let msg = `Marquei que seu meio de transporte é ${ userProfile.transport } e seu nome é ${ userProfile.name }.`;
      if (userProfile.age !== -1) {
        msg += ` E tem ${ userProfile.age } anos de idade.`;
      }

      await step.context.sendActivity(msg);
    } else {
      await step.context.sendActivity('Obrigado. Seu perfil não será armazenado.');
    }

    // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
    return await step.endDialog();
  }

  async agePromptValidator(promptContext) {
    // This condition is our validation rule. You can also change the value at this point.
    return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
  }
}

module.exports.UserProfileDialog = UserProfileDialog;