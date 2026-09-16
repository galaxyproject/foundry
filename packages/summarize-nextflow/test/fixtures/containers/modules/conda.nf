process MINIMAP2_CONDA {
  conda "bioconda::minimap2=2.28"
  script:
  'echo CONDA'
}
