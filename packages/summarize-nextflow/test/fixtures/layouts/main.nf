process INLINE {
  input:
  val word
  output:
  path 'hello.txt', emit: greeting
  script:
  "echo $word > hello.txt"
}
workflow { INLINE('hello') }
