process CONTAINER_ONLY {
  container 'quay.io/biocontainers/samtools:1.17--h00cdaf9_0'
  script:
  'samtools --version'
}
