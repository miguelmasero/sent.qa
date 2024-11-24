import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize assistant or get existing one
export async function getAssistant() {
  const assistants = await openai.beta.assistants.list();
  const existingAssistant = assistants.data.find(a => a.name === 'CleanSync Assistant');
  
  if (existingAssistant) {
    return existingAssistant;
  }

  return await openai.beta.assistants.create({
    name: 'CleanSync Assistant',
    instructions: `You are a cleaning service assistant. Help users with:
    - Scheduling/modifying/canceling cleaning appointments
    - Supply requests and inventory management
    - General inquiries about services
    - Booking guidelines and policies
    Always be professional and courteous.`,
    model: "gpt-4-1106-preview"
  });
}

// Handle chat functionality
export async function handleChat(message: string, threadId?: string) {
  const assistant = await getAssistant();
  
  // Create a thread if none exists
  const thread = threadId 
    ? await openai.beta.threads.retrieve(threadId)
    : await openai.beta.threads.create();

  // Add the message to thread
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: message
  });

  // Run the assistant
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id
  });

  // Wait for completion
  let response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (response.status === 'in_progress' || response.status === 'queued') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  // Get messages
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data[0];

  const messageContent = lastMessage.content[0];
  return {
    message: messageContent.type === 'text' ? messageContent.text.value : 'Unable to process response',
    threadId: thread.id
  };
}
