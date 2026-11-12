process SAMTOOLS_VIEW {
    conda "bioconda::samtools=1.17"
    container "biocontainers/samtools:1.17--h00cdaf9_0"
    script:
    'samtools view'
}
