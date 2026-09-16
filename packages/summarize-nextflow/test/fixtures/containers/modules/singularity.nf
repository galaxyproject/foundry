process SAMTOOLS_SINGULARITY {
  container 'https://depot.galaxyproject.org/singularity/samtools:1.17--h00cdaf9_0'
  conda "bioconda::samtools=1.17"
  script:
  'echo SINGULARITY'
}
