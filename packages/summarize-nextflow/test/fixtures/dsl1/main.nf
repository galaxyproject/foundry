Channel.of('hello').set { words }
process LEGACY {
  input:
  val word from words
  output:
  stdout into greetings
  script:
  "echo $word"
}
