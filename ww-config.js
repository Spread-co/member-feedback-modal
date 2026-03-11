export default {
  editor: {
    label: { en: 'Feedback Modal' },
    icon: 'message-square',
    categories: ['content'],
  },
  triggerEvents: [
    {
      name: 'feedback:reviewSubmitted',
      label: { en: 'On Review Submitted' },
      event: { categoryId: '', rating: 0, comment: '' },
    },
    {
      name: 'feedback:voteRecorded',
      label: { en: 'On Vote Recorded' },
      event: { featureId: '', voteType: 'up' },
    },
    {
      name: 'feedback:close',
      label: { en: 'On Modal Close' },
      event: {},
    },
    {
      name: 'feedback:error',
      label: { en: 'On Error' },
      event: { message: '' },
    },
  ],
  properties: {
    isOpen: {
      label: { en: 'Is Open' },
      type: 'OnOff',
      bindable: true,
      defaultValue: false,
    },
    supabaseUrl: {
      label: { en: 'Supabase URL' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    accessToken: {
      label: { en: 'Auth Token' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    userId: {
      label: { en: 'User ID' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    /* wwEditor:start */
    bindingValidation: {
      isOpen: { type: 'boolean', tooltip: 'Controls modal visibility' },
      accessToken: { type: 'string', tooltip: 'JWT from auth session' },
    },
    /* wwEditor:end */
  },
};
