process FASTQC_DOCKER {
  container 'quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0'
  conda "bioconda::fastqc=0.12.1"
  script:
  'echo DOCKER'
}
