# Mastra CLI

A command-line interface for interacting with Mastra agents using the **Mastra Client SDK**.

## Features

- 🤖 **Type-safe agent interactions** using `@mastra/client-js`
- 💬 **Interactive chat sessions** with conversation memory
- 🌤️ **Quick weather queries** via specialized agents
- 📋 **Thread management** for conversation continuity
- ⚙️ **Workflow execution** support
- 🎨 **Colorful output** using chalk for better readability
- ⚡ **Loading spinners** and progress indicators with ora
- 📦 **Beautiful boxes** and formatted output with boxen
- 📏 **Responsive formatting** that adapts to terminal width

## Installation

The CLI is already installed with the project dependencies, including the Mastra Client SDK.

## Usage

### Basic Commands

```bash
# Run the CLI
npm run cli -- [command] [options]

# List all available agents
npm run cli -- list

# Get info about a specific agent
npm run cli -- info general
npm run cli -- info weather
npm run cli -- info router

# Check server status
npm run cli -- status
```

### Chat with Agents

#### Interactive Chat Mode

```bash
# Chat with the router agent (default)
npm run cli -- chat

# Chat with a specific agent
npm run cli -- chat general
npm run cli -- chat weather

# Continue a previous conversation
npm run cli -- chat --thread cli-1234567890
```

#### Single Message Mode

```bash
# Send a single message to an agent (streaming enabled by default)
npm run cli -- chat general -m "Hello, how are you?"
npm run cli -- chat weather -m "What's the weather in Paris?"

# Send a message and continue thread
npm run cli -- chat router -m "Tell me a joke" -t my-thread-123

# Disable streaming for blocking mode (get full response at once)
npm run cli -- chat general -m "Hello" --no-stream
```

#### Streaming Mode

**Streaming is enabled by default** for real-time responses. You'll see:

- 🌊 Token-by-token output as the agent generates responses
- 🔧 Progress indicators when agents use tools
- ⚡ Faster perceived response time with immediate feedback

```bash
# Streaming is default (explicit flag not needed)
npm run cli -- chat router -m "What is quantum entanglement?"

# Enable streaming explicitly
npm run cli -- chat general -m "Explain AI" --stream

# Disable streaming to wait for complete response
npm run cli -- chat general -m "Explain AI" --no-stream
```

**Progress Updates:** When agents use tools or perform multi-step reasoning, you'll see real-time status indicators:

```txt
🤖 general:
   ⚡ Using tool: query-knowledge-base
   ⚡ Using tool: convert-units-to-metric
The knowledge base contains information about graviton wave theory...
```

**Debug Mode:** Set environment variables to see detailed tool information:

```bash
# Show tool arguments and results
DEBUG_TOOLS=1 npm run cli -- chat general -m "convert 100F to celsius"

# Show all chunk types from stream
DEBUG_CHUNKS=1 npm run cli -- chat router -m "What's the weather?"
```

The CLI header will automatically display active debug flags and API configuration:

```txt
╭──────────────────────────────────────────────────────────╮
│   🤖 Chat with general                                   │
│   🌊 Streaming mode • Thread: cli-176959...              │
│   ────────────────────────────────────────────────────   │
│   API: http://localhost:3000 • Debug: TOOLS, CHUNKS      │
╰──────────────────────────────────────────────────────────╯
```

Output with DEBUG_TOOLS:

```txt
   ⚡ Using tool: convert-units-to-metric
      Args: {
        "value": 100,
        "unit": "fahrenheit"
      }
   ✓ Tool result:
      {
        "convertedValue": 37.78,
        "convertedUnit": "celsius",
        "formula": "(°F - 32) × 5/9 = °C"
      }
```

### Weather Commands

```bash
# Get current weather
npm run cli -- weather "San Francisco"

# Get weather with forecast
npm run cli -- weather "New York" --forecast

# Get weather with custom forecast days
npm run cli -- weather "Tokyo" --forecast --days 5
```

### Workflow Commands

```bash
# Run a workflow
npm run cli -- workflow exampleWorkflow

# Run a workflow with input data
npm run cli -- workflow exampleWorkflow --input '{"name": "John", "age": 30}'
```

## Examples

### Example 1: Quick Weather Check

```bash
npm run cli -- weather "London"
```

### Example 2: Interactive Chat with Router

```bash
npm run cli -- chat router
> You: What's the weather in Paris?
🤖 router: [Weather information...]
> You: Tell me a joke
🤖 router: [Joke...]
> You: exit
```

### Example 3: Check Server Status

```bash
npm run cli -- status
```

### Example 4: Get Agent Information

```bash
npm run cli -- info router
```

## Available Agents

- **router**: Analyzes user intent and delegates to specialized agents
- **general**: Handles general conversation and non-specialized queries
- **weather**: Provides weather information and forecasts

## Tips

- Use `exit` or `quit` to end interactive chat sessions
- Thread IDs allow you to continue previous conversations
- The router agent automatically delegates to the best agent for your query
- Use `--help` on any command to see detailed options

## Development

```bash
# Run CLI in watch mode (auto-reload on changes)
npm run cli:watch -- [command]
```
